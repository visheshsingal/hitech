// Save this as testOpenAI.js in your backend folder
// Run: node testOpenAI.js

require("dotenv").config();

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("🔍 Testing OpenAI API Key...\n");

  // Check if key exists
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not found in .env file!");
    console.log("\n📝 Make sure your .env file contains:");
    console.log("OPENAI_API_KEY=sk-your-key-here");
    return;
  }

  console.log("✅ API Key found:", apiKey.substring(0, 20) + "...");
  console.log("\n📤 Testing API connection...\n");

  try {
    const modelToUse = process.env.OPENAI_MODEL || "gpt-4o-mini";

    console.log(`Testing model: ${modelToUse}`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: "user",
            content: "Say 'Hi, I am working!' if you can read this.",
          },
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI API Error:");
      console.error(JSON.stringify(errorData, null, 2));

      if (response.status === 401) {
        console.log("\n🔴 Your API key is INVALID or EXPIRED");
        console.log("Get a new one at: https://platform.openai.com/api-keys");
      } else if (response.status === 429) {
        console.log("\n🔴 Rate limit exceeded or insufficient credits");
        console.log(
          "Check your account at: https://platform.openai.com/account/billing"
        );
      }
      return;
    }

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      console.log("✅ SUCCESS! OpenAI API is working!\n");
      console.log("🤖 Response:", data.choices[0].message.content);
      console.log("\n✨ Your chatbot should now give AI-powered responses!");
    }
  } catch (error) {
    console.error("❌ Error testing API:", error.message);
  }
}

testOpenAI();
