import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, questionnaireAnswers } = await req.json();

    if (!imageBase64 || !questionnaireAnswers) {
      return NextResponse.json(
        { error: 'Missing required fields: imageBase64 and questionnaireAnswers' },
        { status: 400 }
      );
    }

    // First API call: Visual analysis
    const visualAnalysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: `Analyze this drawing with technical precision. Provide specific, measurable observations about:

1. **Line Quality**: Weight variation, confidence, wobble, control
2. **Proportions**: Specific measurements (head-to-body ratios, limb lengths, symmetry)
3. **Perspective & Form**: Vanishing points, foreshortening, volume rendering
4. **Value Structure**: Light source direction, cast shadows, form shadows, value range (1-10 scale)
5. **Composition**: Rule of thirds, focal point, negative space, balance
6. **Technique Execution**: Brush strokes, blending, layering, texture rendering
7. **Anatomy/Construction** (if applicable): Underlying structure, gesture, weight distribution

Be objective and specific. Use concrete terms. No fluff.`,
            },
          ],
        },
      ],
    });

    const visualAnalysisText = visualAnalysisResponse.choices[0]?.message?.content || '';

    // Second API call: Personalized feedback
    const feedbackPrompt = `You are Drawly, an expert art coach. The user is working on: ${questionnaireAnswers.subject} in ${questionnaireAnswers.style} style${questionnaireAnswers.artists ? `, inspired by ${questionnaireAnswers.artists}` : ''}${questionnaireAnswers.techniques ? `. Techniques: ${questionnaireAnswers.techniques}` : ''}${questionnaireAnswers.feedbackFocus ? `. Focus area: ${questionnaireAnswers.feedbackFocus}` : ''}${questionnaireAnswers.additionalContext ? `. Context: ${questionnaireAnswers.additionalContext}` : ''}.

Based on this technical analysis:
${visualAnalysisText}

Provide coaching feedback that is:
- **Specific**: Reference exact areas, measurements, techniques
- **Actionable**: Give concrete next steps ("adjust the shoulder 15% wider" not "work on proportions")
- **Prioritized**: Start with the most impactful improvements
- **Encouraging but honest**: Acknowledge what's working, then focus on growth areas
- **Brief**: 3-4 key points maximum. No generic praise.

Keep it conversational but direct. One small joke is fine if it fits naturally.`;

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: feedbackPrompt,
        },
      ],
    });

    const feedbackText = feedbackResponse.choices[0]?.message?.content || '';

    return NextResponse.json({
      visualAnalysis: visualAnalysisText,
      feedback: feedbackText,
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}