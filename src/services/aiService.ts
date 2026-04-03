import { type AIProjectPlan, type TaskMode, type ApiProvider } from "../types";

// 流式回调类型
export type StreamingCallback = (content: string) => void;

async function fetchAI(
  systemPrompt: string,
  provider: ApiProvider,
  signal?: AbortSignal,
  onChunk?: StreamingCallback
): Promise<AIProjectPlan> {
  const { apiKey, baseUrl, model } = provider;
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    signal,
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "你是一位专业的任务编排架构师。你必须严格按照用户要求的 JSON 格式输出结果，不要输出任何其他内容。" },
        { role: "user", content: systemPrompt }
      ],
      stream: true // 启用流式输出
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.name} API error: ${response.status} ${errText}`);
  }

  // 流式读取
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // 解析 SSE 格式: data: {"choices":[{"delta":{"content":"..."}}]}
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk?.(fullContent);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  let content = fullContent || "{}";

  // Strip reasoning process (like <think> tags) if present
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Extract JSON part (might be wrapped in markdown code blocks)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    content = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", content);
    throw new Error("AI 返回了无效的格式，请重试。");
  }
}

// 非流式版本（兼容旧代码）
async function fetchAIStatic<T = AIProjectPlan>(systemPrompt: string, provider: ApiProvider, signal?: AbortSignal): Promise<T> {
  const { apiKey, baseUrl, model } = provider;
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    signal,
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "你是一位专业的任务编排架构师。你必须严格按照用户要求的 JSON 格式输出结果，不要输出任何其他内容。" },
        { role: "user", content: systemPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.name} API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content || "{}";

  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    content = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(content) as T;
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", content);
    throw new Error("AI 返回了无效的格式，请重试。");
  }
}

const planSchemaStr = `
Output MUST be a valid JSON object matching exactly this structure:
{
  "isSupported": boolean,
  "suggestion": string,
  "project_name": string,
  "nodes": [
    {
      "id": string,
      "label": string,
      "description": string,
      "type": string,
      "category": string (module, department, or phase phase. same logical group MUST have exactly same category name),
      "dependencies": [
        {
          "id": string (the ID of the node this node depends on),
          "label": string (a short label for the connection e.g. 'Success', 'Approve')
        }
      ]
    }
  ]
}
`;

function getModeFieldRule(language: 'zh' | 'en', mode: TaskMode) {
  if (mode !== 'daily') return '';

  return language === 'zh'
    ? '日常模式字段规则：每个节点只需要真正生成 label 和 type。description 必须输出空字符串 ""，category 必须输出空字符串 ""。dependencies 只保留必要先后关系，但 dependency.label 不要省略，必须尽量短，优先控制在 2 到 4 个中文字符内，例如“准备好”“接着做”“做完后”“收尾”“明早做”。节点 label 必须是短标题，不是完整句子：优先控制在 3 到 6 个中文字符内，尽量不要超过 8 个中文字符，绝对不要超过 10 个中文字符；必须是适合放进小节点里的动作短语，例如“准备馅料”“晚间散步”“记录体重”“控制晚餐”“早点睡觉”。不要出现“规划”“执行”“验证”“阶段一”“模块一”这类抽象术语，也不要写成“晚上出去散步或者……”这种完整口语句子。'
    : 'Daily mode field rules: only truly generate label and type for each node. description MUST be "", category MUST be "". Keep only necessary dependencies, but do not omit dependency.label; keep it very short, ideally 1 to 3 words. Node labels must be short titles, not full sentences: ideally 2 to 4 words, compact enough for a small node, and never verbose.';
}

export async function generatePlan(
  goal: string,
  provider: ApiProvider,
  language: 'zh' | 'en' = 'zh',
  mode: TaskMode = 'daily',
  signal?: AbortSignal,
  onChunk?: StreamingCallback
): Promise<AIProjectPlan> {
  let systemPrompt = "";

  if (mode === 'daily') {
    systemPrompt = language === 'zh'
      ? `你是一位资深的"任务编排架构师"。当前为【日常模式】。请把目标拆成轻量、清晰、适合日常使用的小任务节点。日常模式强调“短标题 + 清楚顺序 + 简单关系”，不是聊天句子，也不是专业项目文档。\n节点类型(type)必须仅限于："planning"（准备/想清楚）、"execution"（动手/执行）、"verification"（确认/收尾）。注意：type 是内部字段，真正展示给用户的是节点 label，所以 label 必须像按钮标题、清单项标题或便签标题，而不是整句描述。\n如果目标里带有“计划”“安排”“方案”这类词，也不要把节点写成空泛计划词，而要转成具体动作短语。例如“减肥计划”应拆成“记录体重”“控制晚餐”“晚间散步”“早点睡觉”“每周复盘”这类短节点；连线也请给出简短关系词。\n请优先产出少量但有效的节点，一般 4 到 8 个即可，避免又碎又长。\n${getModeFieldRule(language, mode)}\n\n目标：${goal}\n\n请严格使用包含 isSupported: true 的 JSON 格式输出，语言请使用中文输出。\n\n${planSchemaStr}`
      : `You are a senior "Task Orchestration Architect". Current mode: [Daily Mode]. Break the goal into lightweight, clear, everyday task nodes. Daily mode should feel like compact task chips: short titles, clear ordering, and simple dependency labels. It should not read like chat sentences or project-management jargon.\nNode types MUST be strictly limited to: "planning", "execution", "verification". Note: type is an internal field; what users mainly see is the node label, so labels must read like short checklist titles rather than full sentences.\nIf the goal includes words like plan, schedule, or routine, do not output vague planning phrases. Convert them into concrete action titles instead.\nPrefer a small but useful set of nodes, usually around 4 to 8.\n${getModeFieldRule(language, mode)}\n\nGoal: ${goal}\n\nOutput strictly as JSON in English, set isSupported to true.\n\n${planSchemaStr}`;
  } else {
    systemPrompt = language === 'zh'
      ? `你是一位资深的"专业任务编排架构师"。当前为【专业模式】。无论目标是复杂项目还是普通事情，都要以更完整、更结构化、更专业的方式进行拆解，而不是根据复杂度拒绝生成。\n请始终输出 isSupported=true。\n专业模式要求：\n1. 节点 label 要清晰专业，但仍贴合目标本身；\n2. 每个节点都要尽量提供 description；\n3. 每个节点都要分配 category，用于表达模块/阶段/职能分组；\n4. type 可以使用更适合该任务的阶段名或模块名，不必限制为 planning/execution/verification；\n5. **特别要求：请为依赖连线（dependencies）提供描述性的标签（label）。**\n6. 即使目标是“包包子”这种日常事情，也要按更完整的专业工作流思路拆解，例如原料准备、面团处理、馅料处理、成型、蒸制、出品检查等，而不是拒绝生成。\n\n目标：${goal}\n\n请严格输出纯 JSON 格式数据，并使用中文输出。\n\n${planSchemaStr}`
      : `You are a senior "Professional Task Orchestration Architect". Current mode: [Professional]. No matter whether the goal is highly complex or relatively ordinary, decompose it in a more structured, information-rich, and professional way instead of rejecting it by complexity.\nAlways output isSupported=true.\nProfessional mode requirements:\n1. Node labels should be clear and professionally framed while still matching the actual goal.\n2. Provide description for each node whenever possible.\n3. Assign category to every node to represent module, phase, or functional grouping.\n4. type can use domain-appropriate phase or module names and does not need to be limited to planning/execution/verification.\n5. **Special Requirement: Provide descriptive labels for dependencies.**\n6. Even for an everyday goal like making buns, decompose it as a more complete workflow such as ingredient prep, dough prep, filling prep, forming, steaming, and final quality check instead of refusing to generate.\n\nGoal: ${goal}\n\nOutput strictly as JSON format in English.\n\n${planSchemaStr}`;
  }

  return await fetchAI(systemPrompt, provider, signal, onChunk);
}

export async function suggestModifications(currentPlan: AIProjectPlan, feedback: string, provider: ApiProvider, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const systemPrompt = language === 'zh'
    ? `当前项目计划如下：\n${JSON.stringify(currentPlan)}\n\n用户反馈：${feedback}\n\n请根据反馈调整计划，保持原子化，输出完整的更新后的 JSON。当前模式：${mode === 'daily' ? '日常模式' : '专业模式'}。${getModeFieldRule(language, mode)} 严格输出纯 JSON，isSupported=true。\n\n${planSchemaStr}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nUser feedback: ${feedback}\n\nAdjust the plan based on feedback, keep it atomic, and output the full updated JSON. Mode: ${mode}. ${getModeFieldRule(language, mode)} Output strictly JSON, isSupported=true.\n\n${planSchemaStr}`;

  return await fetchAIStatic<AIProjectPlan>(systemPrompt, provider, signal);
}

export async function decomposeTask(currentPlan: AIProjectPlan, targetNodeId: string, prompt: string = '', provider: ApiProvider, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const targetNode = currentPlan.nodes.find(n => n.id === targetNodeId);
  const userPromptReq = prompt.trim() ? `\n\n用户特殊拆解需求：${prompt}\n请务必严格按照此需求进行针对性拆解！` : '';
  const userPromptReqEn = prompt.trim() ? `\n\nUser specific decomposition requirement: ${prompt}\nPlease strictly follow this requirement for decomposition!` : '';

  const systemPrompt = language === 'zh'
    ? `当前计划：\n${JSON.stringify(currentPlan)}\n\n用户希望对节点 "${targetNode?.label}" (ID: ${targetNodeId}) 细分拆解。将其替换为更详细子任务。要求：1. 保持依赖关系正确重连；2. 输出完整的更新后的 JSON；3. 当前模式：${mode === 'daily' ? '日常模式' : '专业模式'}；4. ${getModeFieldRule(language, mode)}。${userPromptReq}\n\n${planSchemaStr}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nUser wants to decompose node "${targetNode?.label}" (ID: ${targetNodeId}). Replace it with more detailed sub-tasks, keep dependencies rewired correctly, and output the full updated JSON. Mode: ${mode}. ${getModeFieldRule(language, mode)}.${userPromptReqEn}\n\n${planSchemaStr}`;

  return await fetchAIStatic<AIProjectPlan>(systemPrompt, provider, signal);
}

export async function generateGroupTasks(groupName: string, groupDescription: string, provider: ApiProvider, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const systemPrompt = language === 'zh'
    ? `你是一位资深"任务编排架构师"。当前为【${mode === 'daily' ? '日常模式' : '专业模式'}】。\n用户新建了一个"${groupName}"模块框（描述：${groupDescription || '无'}）。请为其生成相关的子任务节点。类型限于："planning"、"execution"、"verification"。${mode === 'daily' ? ` ${getModeFieldRule(language, mode)}` : ` 所有新节点的 category 必须全等于"${groupName}"。`}\n输出 JSON，isSupported=true。\n\n${planSchemaStr}`
    : `You are a senior Task Orchestration Architect. Mode: [${mode === 'daily' ? 'Daily' : 'Professional'}].\nUser created module "${groupName}" (desc: ${groupDescription || 'None'}). Generate sub-tasks for it. Types limited to: "planning", "execution", "verification". ${mode === 'daily' ? getModeFieldRule(language, mode) : `Category for all MUST be exactly "${groupName}".`}\nOutput JSON, isSupported=true.\n\n${planSchemaStr}`;

  return await fetchAIStatic<AIProjectPlan>(systemPrompt, provider, signal);
}

export async function generateNextModule(currentPlan: AIProjectPlan, sourceModuleName: string, provider: ApiProvider, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<{ label: string; description: string; edgeLabel?: string }> {
  const systemPrompt = language === 'zh'
    ? `当前计划：\n${JSON.stringify(currentPlan)}\n\n用户从模块"${sourceModuleName}"拉出一条连线到空白。请预测下一个逻辑模块名称、简短描述，及这条连线的"标签"（如"完成"）。模式：${mode === 'daily' ? '日常' : '专业'}。\n务必输出符合此 JSON 格式：{"label":"x","description":"y","edgeLabel":"z"}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nUser dragged connection from module "${sourceModuleName}" to empty space. Predict next logical module name, description, and this connection's label. Mode: ${mode}.\nProduce JSON exactly like this: {"label":"x","description":"y","edgeLabel":"z"}`;

  return await fetchAIStatic<{ label: string; description: string; edgeLabel?: string }>(systemPrompt, provider, signal);
}

export async function modifySelectedTasks(currentPlan: AIProjectPlan, selectedNodeIds: string[], feedback: string, provider: ApiProvider, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const selectedNodesInfo = currentPlan.nodes.filter(n => selectedNodeIds.includes(n.id)).map(n => n.label).join(', ');
  const systemPrompt = language === 'zh'
    ? `当前计划：\n${JSON.stringify(currentPlan)}\n\n选中的节点：[${selectedNodesInfo}] (IDs: ${selectedNodeIds.join(', ')})。\n修改要求：${feedback}\n\n请根据要求仅针对选中的节点及关联调整，并输出完整的更新后项目 JSON。模式：${mode === 'daily' ? '日常' : '专业'}。${getModeFieldRule(language, mode)}\n\n${planSchemaStr}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nSelected nodes: [${selectedNodesInfo}] (IDs: ${selectedNodeIds.join(', ')}).\nModification req: ${feedback}\n\nAdjust ONLY the selected nodes and related relationships, then output the full updated project JSON. Mode: ${mode}. ${getModeFieldRule(language, mode)}\n\n${planSchemaStr}`;

  return await fetchAIStatic<AIProjectPlan>(systemPrompt, provider, signal);
}

export async function validateApiKey(provider: ApiProvider): Promise<void> {
  const { apiKey, baseUrl, model } = provider;
  const url = `${baseUrl}/chat/completions`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "ok" },
        { role: "user", content: "ok" }
      ],
      max_tokens: 1
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.name} API error: ${response.status} ${errText}`);
  }
}
