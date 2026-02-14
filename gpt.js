import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EsclataionDecision = z.object({
    escalate: z.boolean(),
    confidence: z.number(),
});

export async function getGPTResponse(conversationHistory) {

    const systemPrompt = `
        You are a customer support chatbot.
        Keep responses concise.
        If user asks for a human agent, say:
        "I'll connect you with a human agent."
    `

    const response = await openai.responses.create({
        model: "gpt-5-nano",
        input: [
            { role: "system", content: systemPrompt },
            ...conversationHistory
        ]
    }).catch(err => {
        console.log("Error getting GPT reply");
        console.log(err);
        return null;
    });

    return response?.output_text || "Sorry I was not able to process that";
}


export async function classifyEscalation(conversationHistory) {
    const systemPrompt = `
        You are an escalation classifier for a customer support system.

        Escalate = true if:
        - User explicitly asks for human/agent
        - User expresses strong frustration
        - The issue requires account-specific action
        - The model is unlikely to solve it safely

        Otherwise escalate = false.
        Return only valid JSON.
    `;

    const response = await openai.responses.create({
        model: "gpt-5-nano",
        input: [
            { role: "system", content: systemPrompt },
            conversationHistory[conversationHistory.length - 1]
        ],
        text: {
            format: zodTextFormat(EsclataionDecision, "escalation_decision"),
        }
    }).catch(err => {
        console.log("Escalation classification error");
        console.log(err);
        return { escalate: false, confidence: 0 };
    });

    return JSON.parse(response?.output_text);
}
