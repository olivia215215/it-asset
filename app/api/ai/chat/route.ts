import { NextRequest } from "next/server";
import { verifyAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callDeepSeek } from "@/lib/ai/client";
import { withAiFallback } from "@/lib/ai/with-fallback";
import { generateConfirmationToken } from "@/lib/ai/confirmation-token";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    const { message, history } = (await request.json()) as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };
    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    const [assets, pendingTickets] = await Promise.all([
      prisma.assetInstance.findMany({
        where: { holderId: user.userId },
        include: { model: true },
      }),
      prisma.ticket.findMany({
        where: {
          applicantId: user.userId,
          status: {
            in: [
              "SUBMITTED",
              "PENDING_MANAGER_1",
              "PENDING_MANAGER_2",
              "PENDING_IT",
              "IN_PROGRESS",
            ],
          },
        },
      }),
    ]);

    const userContext = {
      assets: assets.map((a) => ({
        id: a.id,
        modelName: a.model.modelName,
        brandName: a.model.brandName,
        category: a.model.category,
        status: a.status,
        warrantyExpiry: a.warrantyExpiry.toISOString(),
      })),
      pendingTickets: pendingTickets.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    };

    const systemPrompt = `你是一个IT助手，帮助用户处理IT资产管理相关事务。请始终以 JSON 格式输出。

## 原则
- 使用简洁友好的中文回复
- 涉及创建工单或申领设备时，需要先获得用户确认
- 用户询问价格或供应商信息时，回复"抱歉，该信息不在你的权限范围内"
- 根据用户上下文信息提供个性化帮助

## 输入格式
{
  "history": [{"role": "user|assistant", "content": "..."}],
  "message": "用户当前消息",
  "userContext": {
    "assets": [{"id": "...", "modelName": "...", "brandName": "...", "category": "...", "status": "...", "warrantyExpiry": "..."}],
    "pendingTickets": [{"id": "...", "type": "...", "status": "...", "createdAt": "..."}]
  }
}

## 意图分类
- query_asset: 查询资产信息
- query_warranty: 查询保修信息
- query_ticket: 查询工单状态
- guide_repair: 指导报修(需要用户确认)
- guide_apply: 指导申领(需要用户确认)
- fallback: 其他问题

## 输出格式
{
  "intent": "query_asset|query_warranty|query_ticket|guide_repair|guide_apply|fallback",
  "reply": "回复内容",
  "needConfirmation": true/false,
  "pendingAction": {
    "type": "create_repair|create_apply",
    "description": "操作描述",
    "params": { ... }
  }
}`;

    const historyMessages = (history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    const aiResult = await withAiFallback(
      () =>
        callDeepSeek<{
          intent: string;
          reply: string;
          needConfirmation: boolean;
          pendingAction: {
            type: "create_repair" | "create_apply";
            description: string;
            params: Record<string, unknown>;
          } | null;
        }>({
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            {
              role: "user",
              content: JSON.stringify({
                history: historyMessages,
                message,
                userContext,
              }),
            },
          ],
        }),
      "AI 助手暂时不可用，你可以通过「我的资产」查看资产信息，或通过「申领设备」/「报修」提交申请。",
    );

    if (!aiResult.ok) {
      return Response.json(aiResult);
    }

    // 如果 needConfirmation=true，生成 confirmationToken
    if (aiResult.data.needConfirmation && aiResult.data.pendingAction) {
      const token = await generateConfirmationToken({
        userId: user.userId,
        action: aiResult.data.pendingAction.type,
        params: aiResult.data.pendingAction.params,
      });

      return Response.json({
        ok: true,
        data: {
          ...aiResult.data,
          confirmationToken: token,
        },
      });
    }

    return Response.json(aiResult);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
