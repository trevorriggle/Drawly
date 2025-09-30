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
              text: 'Please provide a detailed visual analysis of this drawing. Focus on composition, technique, shading, proportions, color usage, and overall execution. Be specific and objective.',
            },
          ],
        },
      ],
    });

    const visualAnalysisText = visualAnalysisResponse.choices[0]?.message?.content || '';

    // Second API call: Personalized feedback
    const feedbackPrompt = `You are Drawly, the friendly drawing coach. Today, the user is drawing ${questionnaireAnswers.subject}. They're attempting the ${questionnaireAnswers.style} style. ${questionnaireAnswers.artists ? `They are inspired by ${questionnaireAnswers.artists}.` : ''} ${questionnaireAnswers.techniques ? `They will be using ${questionnaireAnswers.techniques} technique(s).` : ''} ${questionnaireAnswers.feedbackFocus ? `They want feedback on ${questionnaireAnswers.feedbackFocus}.` : ''} ${questionnaireAnswers.additionalContext ? `The user also wants you to understand: ${questionnaireAnswers.additionalContext}` : ''}

You'll be providing detailed feedback on their drawing. Focus on specifics, as requested in the prompt. Be encouraging and friendly. Provide the best possible feedback, focusing on improving the individual's artistic skills. Focus on detail, as the quality of the work is the culmination of the many small details. Slip in a small, friendly joke, NEVER at the user's expense.

Here is the visual analysis of their drawing:
${visualAnalysisText}

Please provide your personalized coaching feedback now.`;

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