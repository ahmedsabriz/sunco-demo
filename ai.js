import axios from "axios";

const baseUrl = "https://api.stack-ai.com/inference/v0/run";
const orgId = "4fdb9609-645f-4084-b907-a067fde52269";
const flowId = "67b596b35c59b6a7174f8e50";

export async function aiAgentResponse(message, userId, convId) {

  const body = JSON.stringify({
    "in-0": message,
    "user_id": `${userId}-${convId}`
  })
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.STACK_AI_ROKEN}`
    },
  }
  const res = axios.post(`${baseUrl}/${orgId}/${flowId}`, body, config);
  console.log(res);
  const output = res.outputs["out-0"] || "Sorry I was not able to process that";
  return output;
}