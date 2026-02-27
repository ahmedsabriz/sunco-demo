import SunshineConversationsClient from "sunshine-conversations-client";


const defaultClient = SunshineConversationsClient.ApiClient.instance;
defaultClient.basePath = `https://${process.env.ZENDESK_BASEURL}/sc`;
var basicAuth = defaultClient.authentications['basicAuth'];
basicAuth.username = process.env.SUNCO_KEY_ID;
basicAuth.password = process.env.SUNCO_KEY_SECRET;

const activityAPI = new SunshineConversationsClient.ActivitiesApi();
const messagesAPI = new SunshineConversationsClient.MessagesApi();
const switchboardAPI = new SunshineConversationsClient.SwitchboardActionsApi();


export async function sendTypingIndicator(appId, conversationId) {
  const typingEvent = { "author": { "type": "business" }, "type": "typing:start" };
  await activityAPI.postActivity(appId, conversationId, typingEvent).catch(err => {
    console.log("Error sending typing activity");
    console.log(err);
  });
}

export async function sendMessage(appId, conversationId, text) {
  const messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.setAuthor({ type: "business" });
  messagePost.setContent({ type: "text", text });

  await messagesAPI.postMessage(
    appId,
    conversationId,
    messagePost
  ).catch(err => {
    console.log("Error sending reply to SunCo");
    console.log(err);
  });
}

async function passControlToZendesk(appId, conversationId) {
  const passControlBody = new SunshineConversationsClient.PassControlBody("zd-agentWorkspace");
  await switchboardAPI.passControl(appId, conversationId, passControlBody).then(async _ => {
    const escalationText = "Sorry that I was not able to help. I am transferring you to a human agent now.";
    return sendMessage(appId, conversationId, escalationText);
  }).catch(err => {
    console.log("Error passing control to zd-agentWorkspace");
    console.log(err);

    const escalationFailedText = "Sorry I am unable to transfer you to a human right now.";
    return sendMessage(appId, conversationId, escalationFailedText);
  });
}