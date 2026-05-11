import { NextRequest } from "next/server";
import { verifyAuth, requireOneOf, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callDeepSeek } from "@/lib/ai/client";
import { withAiFallback } from "@/lib/ai/with-fallback";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "EMPLOYEE", "MANAGER");

    const { requirement } = (await request.json()) as {
      requirement?: string;
    };
    if (!requirement || typeof requirement !== "string") {
      return Response.json(
        { error: "requirement is required" },
        { status: 400 },
      );
    }

    const models = await prisma.assetModel.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: {
          select: {
            instances: {
              where: { status: "IN_STOCK" },
            },
          },
        },
      },
    });

    const modelListJson = JSON.stringify(
      models.map((m) => ({
        id: m.id,
        category: m.category,
        brandName: m.brandName,
        modelName: m.modelName,
        specs: m.specs,
        stock: m._count.instances,
        warrantyMonths: m.warrantyMonths,
      })),
    );

    const systemPrompt = `你是一个专业的IT设备推荐助手。
用户会提供需求描述和可用型号列表。
你需要根据用户需求推荐最合适的设备型号。

输出JSON格式:
{
  "recommendations": [
    { "modelId": "型号ID", "score": 分数(0-100), "reason": "推荐理由" }
  ],
  "topPick": "最佳型号ID"
}

注意事项:
- 忽略已停产(DISCONTINUED)的型号
- 库存为0的型号标注"暂无库存"
- 评分范围0-100
- 按推荐度从高到低排序`;

    const userMessage = `用户需求: ${requirement}\n\n可用型号: ${modelListJson}`;

    const result = await withAiFallback(
      () =>
        callDeepSeek<{
          recommendations: {
            modelId: string;
            score: number;
            reason: string;
          }[];
          topPick: string;
        }>({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      "推荐服务暂时不可用，请稍后重试或浏览全部可用型号自行选择。",
    );

    return Response.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
