import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

async function generateChatResponse(userMessage) {
    const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }]
    });
    return completion.data.choices[0].message.content.trim();
}

module.exports = { generateChatResponse };