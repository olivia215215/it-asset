import { NextRequest } from "next/server";
import { verifyAuth, requireOneOf, AuthError } from "@/lib/auth";
import { callDeepSeek } from "@/lib/ai/client";
import { enforceTriageRules, type TriageResult } from "@/lib/ai/triage";
import { withAiFallback } from "@/lib/ai/with-fallback";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "EMPLOYEE", "MANAGER");

    const { description } = (await request.json()) as {
      description?: string;
    };
    if (!description || typeof description !== "string") {
      return Response.json(
        { error: "description is required" },
        { status: 400 },
      );
    }

    const systemPrompt = `你是一个IT故障诊断助手。
根据用户描述的故障，进行分类和严重程度评估。

分类: hardware(硬件故障), software(软件问题), user_error(用户操作错误)
严重程度: high(严重影响工作), medium(部分影响), low(轻微影响)

规则:
- 硬件故障 → needRepair=true
- 软件问题 → 优先提供自助解决方案
- 用户操作错误 → 不需要维修

输出JSON格式:
{
  "category": "hardware|software|user_error",
  "severity": "high|medium|low",
  "needRepair": true/false,
  "reason": "诊断理由",
  "selfHelp": "自助解决建议(可为null)"
}`;

    const aiResult = await withAiFallback(
      () =>
        callDeepSeek<TriageResult>({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `故障描述: ${description}` },
          ],
        }),
      "故障诊断暂时不可用，你的报修工单已提交，IT 管理员将尽快处理。",
    );

    if (aiResult.ok) {
      return Response.json({
        ok: true,
        data: enforceTriageRules(aiResult.data),
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
