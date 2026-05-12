export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { notionToken, pageId, question, userName } = req.body;

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    const notionData = await notionRes.json();
    
    if (!notionData.results) {
      return res.status(400).json({ error: '노션 페이지를 읽을 수 없어요. 토큰과 페이지 ID를 확인해주세요!' });
    }

    let notionContent = '';
    for (const block of notionData.results) {
      const type = block.type;
      const richText = block[type]?.rich_text;
      if (richText) {
        notionContent += richText.map(r => r.plain_text).join('') + '\n';
      }
    }

    if (!notionContent) notionContent = '페이지 내용이 비어있어요.';

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `당신은 ${userName || '매니저'}님의 귀여운 AI 비서 커비입니다. 노션 페이지의 내용을 기반으로 질문에 답해주세요. 친근하고 따뜻하게 답변하되, 가끔 "포요~" 같은 귀여운 표현을 살짝 섞어주세요. 노션에 없는 내용은 솔직하게 모른다고 해주세요.\n\n노션 페이지 내용:\n${notionContent}`,
        messages: [{ role: 'user', content: question }]
      })
    });

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(claudeData.error.message);

    res.status(200).json({ answer: claudeData.content[0].text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
