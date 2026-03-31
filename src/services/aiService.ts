import { type AIProjectPlan, type TaskMode } from "../types";

const modelName = "MiniMax-M2.7";
const baseURL = "https://api.minimaxi.com/v1/chat/completions";

async function fetchMiniMax(systemPrompt: string, customKey?: string, signal?: AbortSignal) {
  const finalKey = customKey || import.meta.env.VITE_MINIMAX_API_KEY || "";
  const response = await fetch(baseURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${finalKey}`
    },
    signal,
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: "你是一位专业的任务编排架构师。你必须严格按照用户要求的 JSON 格式输出结果，不要输出任何其他内容。" },
        { role: "user", content: systemPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content || "{}";
  // MiniMax M2.7 可能返回 <think>...</think> 标签包裹的推理过程，需要剥离
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // 提取 JSON 部分（可能被 markdown 代码块包裹）
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    content = jsonMatch[1].trim();
  }
  return JSON.parse(content);
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

export async function generatePlan(goal: string, apiKey?: string, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  let systemPrompt = "";
  
  if (mode === 'daily') {
    systemPrompt = language === 'zh' 
      ? `你是一位资深的“任务编排架构师”。当前为【日常模式】。请将以下目标拆解为逻辑严密、可执行、可验证的原子化任务节点。节点类型(type)必须仅限于："planning"（调研/规划）、"execution"（执行）、"verification"（验证）。\n请为每个节点分配一个所属的模块/阶段名称（category），相同流程或部门的节点应具有完全相同的 category 名称。\n**特别要求：请为节点之间的连线（dependencies）提供描述性的标签（label），例如“完成”、“数据输入”、“审核通过”等。**\n\n目标：${goal}\n\n请严格使用包含 isSupported: true 的 JSON 格式输出，语言请使用中文输出。\n\n${planSchemaStr}`
      : `You are a senior "Task Orchestration Architect". Current mode: [Daily Mode]. Decompose the goal into atomic tasks. Node types MUST be strictly limited to: "planning", "execution", "verification".\nAssign a module/phase name (category) to each node. Nodes in the same flow or department should have the exact same category name.\n**Special Requirement: Provide descriptive labels for the connections (dependencies) between nodes, e.g., "Completed", "Data Input", "Approved".**\n\nGoal: ${goal}\n\nOutput strictly as JSON in English, set isSupported to true.\n\n${planSchemaStr}`;
  } else {
    systemPrompt = language === 'zh'
      ? `你是一位资深的“专业任务编排架构师”。当前为【专业模式】。请评估以下目标是否属于特定的复杂专业任务（如开发、制衣、建筑）。\n支持拆解：isSupported=true，并将任务拆解为符合该专业标准流程的模块（如服装："企划","设计","制版"等作 type）。同时为每个节点分配 category（大模块名），同流程节点共用一种 category。\n**特别要求：请为依赖连线（dependencies）提供描述性的标签（label）。**\n若太日常/模糊：isSupported=false，并在 suggestion 给出建议，nodes 为空数组。\n\n目标：${goal}\n\n请严格输出纯 JSON 格式数据，并使用中文输出。\n\n${planSchemaStr}`
      : `You are a senior "Professional Task Orchestration Architect". Current mode: [Professional]. Evaluate if goal is a complex professional task.\nIf supported: isSupported=true, decompose into domain-specific modules (use phase names as 'type', e.g. "Planning", "Design"). Assign large module name as 'category'.\n**Special Requirement: Provide descriptive labels for dependencies.**\nIf unsupported: isSupported=false, provide 'suggestion', nodes=[]\n\nGoal: ${goal}\n\nOutput strictly as JSON format in English.\n\n${planSchemaStr}`;
  }

  return await fetchMiniMax(systemPrompt, apiKey, signal);
}

export async function suggestModifications(currentPlan: AIProjectPlan, feedback: string, apiKey?: string, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const systemPrompt = language === 'zh'
    ? `当前项目计划如下：\n${JSON.stringify(currentPlan)}\n\n用户反馈：${feedback}\n\n请根据反馈调整计划，保持原子化，输出完整的更新后的 JSON。所有节点必须有 category 字段。**特别要求：为连线提供描述性的标签（label）**。当前模式：${mode === 'daily' ? '日常模式' : '专业模式'}。严格输出纯 JSON，isSupported=true。\n\n${planSchemaStr}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nUser feedback: ${feedback}\n\nAdjust plan based on feedback, keep atomic, output complete updated JSON. Nodes must have category. **Special Req: Descriptive labels for dependencies.** Mode: ${mode}. Output strictly JSON, isSupported=true.\n\n${planSchemaStr}`;

  return await fetchMiniMax(systemPrompt, apiKey, signal);
}

export async function decomposeTask(currentPlan: AIProjectPlan, targetNodeId: string, prompt: string = '', apiKey?: string, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const targetNode = currentPlan.nodes.find(n => n.id === targetNodeId);
  const userPromptReq = prompt.trim() ? `\n\n用户特殊拆解需求：${prompt}\n请务必严格按照此需求进行针对性拆解！` : '';
  const userPromptReqEn = prompt.trim() ? `\n\nUser specific decomposition requirement: ${prompt}\nPlease strictly follow this requirement for decomposition!` : '';

  const systemPrompt = language === 'zh'
    ? `当前计划：\n${JSON.stringify(currentPlan)}\n\n用户希望对节点 "${targetNode?.label}" (ID: ${targetNodeId}) 细分拆解。将其替换为更详细子任务。要求：1. 继承原 category。2. 重连依赖关系：原依赖该节点的节点现在依赖新子任务的末端；新子任务的起始依赖原节点的依赖。\n3. **连线要有描述标签（label）**。\n4. 输出完整的更新后的 JSON。当前模式：${mode === 'daily' ? '日常模式' : '专业模式'}。${userPromptReq}\n\n${planSchemaStr}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nUser wants to decompose node "${targetNode?.label}" (ID: ${targetNodeId}). Replace with detailed sub-tasks. Req: 1. Inherit category. 2. Rewire dependencies properly. 3. **Labels for dependencies.** 4. Output complete updated JSON. Mode: ${mode}.${userPromptReqEn}\n\n${planSchemaStr}`;

  return await fetchMiniMax(systemPrompt, apiKey, signal);
}

export async function generateGroupTasks(groupName: string, groupDescription: string, apiKey?: string, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const systemPrompt = language === 'zh'
    ? `你是一位资深“任务编排架构师”。当前为【${mode === 'daily' ? '日常模式' : '专业模式'}】。\n用户新建了一个“${groupName}”模块框（描述：${groupDescription || '无'}）。请为其生成相关的子任务节点。类型限于："planning"、"execution"、"verification"。\n所有新节点的 category 必须全等于“${groupName}”。**连线需描述标签（label）**。\n输出 JSON，isSupported=true。\n\n${planSchemaStr}`
    : `You are a senior Task Orchestration Architect. Mode: [${mode === 'daily' ? 'Daily' : 'Professional'}].\nUser created module "${groupName}" (desc: ${groupDescription || 'None'}). Generate sub-tasks for it. Types limited to: "planning", "execution", "verification".\nCategory for all MUST be exactly "${groupName}". **Dependency labels required.**\nOutput JSON, isSupported=true.\n\n${planSchemaStr}`;

  return await fetchMiniMax(systemPrompt, apiKey, signal);
}

export async function generateNextModule(currentPlan: AIProjectPlan, sourceModuleName: string, apiKey?: string, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<{ label: string; description: string; edgeLabel?: string }> {
  const systemPrompt = language === 'zh'
    ? `当前计划：\n${JSON.stringify(currentPlan)}\n\n用户从模块“${sourceModuleName}”拉出一条连线到空白。请预测下一个逻辑模块名称、简短描述，及这条连线的“标签”（如“完成”）。模式：${mode === 'daily' ? '日常' : '专业'}。\n务必输出符合此 JSON 格式：{"label":"x","description":"y","edgeLabel":"z"}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nUser dragged connection from module "${sourceModuleName}" to empty space. Predict next logical module name, description, and this connection's label. Mode: ${mode}.\nProduce JSON exactly like this: {"label":"x","description":"y","edgeLabel":"z"}`;

  return await fetchMiniMax(systemPrompt, apiKey, signal);
}

export async function modifySelectedTasks(currentPlan: AIProjectPlan, selectedNodeIds: string[], feedback: string, apiKey?: string, language: 'zh' | 'en' = 'zh', mode: TaskMode = 'daily', signal?: AbortSignal): Promise<AIProjectPlan> {
  const selectedNodesInfo = currentPlan.nodes.filter(n => selectedNodeIds.includes(n.id)).map(n => n.label).join(', ');
  const systemPrompt = language === 'zh'
    ? `当前计划：\n${JSON.stringify(currentPlan)}\n\n选中的节点：[${selectedNodesInfo}] (IDs: ${selectedNodeIds.join(', ')})。\n修改要求：${feedback}\n\n请根据要求**仅针对选中的节点及关联**调整。输出完整的更新后的项目 JSON。\n**要求连线标签（label），必须带 category。**模式：${mode === 'daily' ? '日常' : '专业'}。\n\n${planSchemaStr}`
    : `Current plan:\n${JSON.stringify(currentPlan)}\n\nSelected nodes: [${selectedNodesInfo}] (IDs: ${selectedNodeIds.join(', ')}).\nModification req: ${feedback}\n\nAdjust ONLY selected nodes/relationships based on req. Output complete updated JSON.\n**Req: Dependency labels, category.** Mode: ${mode}.\n\n${planSchemaStr}`;

  return await fetchMiniMax(systemPrompt, apiKey, signal);
}

export async function validateApiKey(apiKey: string): Promise<void> {
  const response = await fetch(baseURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: "ok" },
        { role: "user", content: "ok" }
      ],
      max_tokens: 1
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} ${errText}`);
  }
}
