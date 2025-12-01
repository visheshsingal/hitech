const Property = require("../models/Property");

/**
 * Handle chatbot message with AI-powered responses using OpenAI
 */
exports.handleChatMessage = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    console.log("📩 User message:", message);

    // Search for properties based on user query
    const properties = await searchProperties(message);
    console.log("🔍 Properties found:", properties.length);

    // If no exact matches, get alternative suggestions
    let alternatives = [];
    if (properties.length === 0) {
      alternatives = await getAlternativeSuggestions(message);
      console.log("💡 Alternative suggestions:", alternatives.length);
    }

    // Generate AI response using OpenAI API
    const aiResponse = await generateAIResponse(
      message,
      properties,
      alternatives,
      conversationHistory
    );
    console.log("🤖 AI Response generated");

    // Generate dynamic suggestions based on query
    const suggestions = generateFollowUpSuggestions(
      message,
      properties,
      alternatives
    );

    res.status(200).json({
      success: true,
      reply: aiResponse,
      properties:
        properties.length > 0
          ? properties.slice(0, 3)
          : alternatives.length > 0
          ? alternatives.slice(0, 3)
          : null,
      suggestions: suggestions.length > 0 ? suggestions : null,
    });
  } catch (error) {
    console.error("❌ Chatbot error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process message",
      reply:
        "I apologize, but I encountered an error. Please try again or contact our support team at +91 98765 43210.",
    });
  }
};

/**
 * Generate smart follow-up suggestions
 */
function generateFollowUpSuggestions(query, properties, alternatives) {
  const suggestions = [];
  const lowerQuery = query.toLowerCase();

  // If properties found, suggest related searches
  if (properties.length > 0) {
    const firstProperty = properties[0];

    // Suggest different BHK
    if (firstProperty.bhk === 2) {
      suggestions.push("Show me 3 BHK properties");
    } else if (firstProperty.bhk === 3) {
      suggestions.push("Show me 2 BHK properties");
    }

    // Suggest same city
    if (firstProperty.city) {
      suggestions.push(`More properties in ${firstProperty.city}`);
    }

    // Suggest price range
    const price = firstProperty.price;
    if (price < 5000000) {
      suggestions.push("Properties under 50 lakh");
    } else if (price >= 5000000 && price < 10000000) {
      suggestions.push("Properties 50-100 lakh");
    }
  }
  // If no properties, suggest adjusting criteria
  else if (alternatives.length === 0) {
    if (lowerQuery.includes("bhk")) {
      suggestions.push("Show me all available properties");
    }
    if (lowerQuery.includes("lakh") || lowerQuery.includes("crore")) {
      suggestions.push("What's your latest property?");
    }
    suggestions.push("Contact information");
    suggestions.push("Schedule a property visit");
  }
  // If alternatives shown
  else {
    suggestions.push("Show me all available properties");
    suggestions.push("Contact a dealer");
    suggestions.push("What amenities are available?");
  }

  // Always offer these generic helpful options if space
  if (suggestions.length < 3) {
    const generic = [
      "Contact information",
      "Schedule a property visit",
      "What amenities are available?",
    ];
    generic.forEach((s) => {
      if (suggestions.length < 4 && !suggestions.includes(s)) {
        suggestions.push(s);
      }
    });
  }

  return suggestions.slice(0, 4); // Return max 4 suggestions
}

/**
 * Search properties based on user query
 */
async function searchProperties(query) {
  try {
    const lowerQuery = query.toLowerCase();

    // Extract BHK from query
    const bhkMatch = lowerQuery.match(/(\d+)\s*(bhk|bedroom|bed)/);
    const bhk = bhkMatch ? parseInt(bhkMatch[1]) : null;

    // Extract price range
    let minPrice = null;
    let maxPrice = null;

    const underMatch = lowerQuery.match(
      /under|below|less than|up to\s*(\d+)\s*(lakh|l|cr|crore)/
    );
    if (underMatch) {
      const amount = parseFloat(underMatch[1]);
      const unit = underMatch[2];
      maxPrice = unit.startsWith("cr") ? amount * 10000000 : amount * 100000;
    }

    const rangeMatch = lowerQuery.match(
      /(\d+)\s*-\s*(\d+)\s*(lakh|l|cr|crore)/
    );
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      const unit = rangeMatch[3];
      minPrice = unit.startsWith("cr") ? min * 10000000 : min * 100000;
      maxPrice = unit.startsWith("cr") ? max * 10000000 : max * 100000;
    }

    // Extract city from query
    const cityMatch = lowerQuery.match(/in\s+(\w+)|(\w+)\s+city|near\s+(\w+)/);
    const city = cityMatch
      ? cityMatch[1] || cityMatch[2] || cityMatch[3]
      : null;

    // Build MongoDB query
    let searchQuery = {};

    if (bhk) {
      searchQuery.bhk = bhk;
    }

    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = minPrice;
      if (maxPrice) searchQuery.price.$lte = maxPrice;
    }

    if (city) {
      searchQuery.city = new RegExp(city, "i");
    }

    // If query is generic, return recent properties
    if (Object.keys(searchQuery).length === 0) {
      if (
        lowerQuery.includes("property") ||
        lowerQuery.includes("properties") ||
        lowerQuery.includes("house") ||
        lowerQuery.includes("flat") ||
        lowerQuery.includes("apartment") ||
        lowerQuery.includes("show") ||
        lowerQuery.includes("available") ||
        lowerQuery.includes("latest") ||
        lowerQuery.includes("new")
      ) {
        return await Property.find().sort({ createdAt: -1 }).limit(5);
      }
      return [];
    }

    // Execute search
    const properties = await Property.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(5);

    return properties;
  } catch (error) {
    console.error("❌ Property search error:", error);
    return [];
  }
}

/**
 * Get alternative property suggestions when exact match not found
 */
async function getAlternativeSuggestions(query) {
  try {
    const lowerQuery = query.toLowerCase();

    // Extract criteria from query
    const bhkMatch = lowerQuery.match(/(\d+)\s*(bhk|bedroom|bed)/);
    const bhk = bhkMatch ? parseInt(bhkMatch[1]) : null;

    const underMatch = lowerQuery.match(
      /under|below|less than|up to\s*(\d+)\s*(lakh|l|cr|crore)/
    );
    let maxPrice = null;
    if (underMatch) {
      const amount = parseFloat(underMatch[1]);
      const unit = underMatch[2];
      maxPrice = unit.startsWith("cr") ? amount * 10000000 : amount * 100000;
    }

    const cityMatch = lowerQuery.match(/in\s+(\w+)|(\w+)\s+city|near\s+(\w+)/);
    const city = cityMatch
      ? cityMatch[1] || cityMatch[2] || cityMatch[3]
      : null;

    // Strategy 1: Relax price constraint (increase by 20%)
    if (maxPrice && bhk) {
      const relaxedMaxPrice = maxPrice * 1.2;
      const alternatives = await Property.find({
        bhk: bhk,
        price: { $lte: relaxedMaxPrice },
        ...(city && { city: new RegExp(city, "i") }),
      })
        .sort({ price: 1 })
        .limit(3);

      if (alternatives.length > 0) return alternatives;
    }

    // Strategy 2: Try adjacent BHK (±1)
    if (bhk && maxPrice) {
      const alternatives = await Property.find({
        bhk: { $in: [bhk - 1, bhk + 1] },
        price: { $lte: maxPrice },
        ...(city && { city: new RegExp(city, "i") }),
      })
        .sort({ bhk: 1, price: 1 })
        .limit(3);

      if (alternatives.length > 0) return alternatives;
    }

    // Strategy 3: Same BHK, any price in that city
    if (bhk && city) {
      const alternatives = await Property.find({
        bhk: bhk,
        city: new RegExp(city, "i"),
      })
        .sort({ price: 1 })
        .limit(3);

      if (alternatives.length > 0) return alternatives;
    }

    // Strategy 4: Same price range, any BHK
    if (maxPrice) {
      const alternatives = await Property.find({
        price: { $lte: maxPrice * 1.3 },
      })
        .sort({ price: 1 })
        .limit(3);

      if (alternatives.length > 0) return alternatives;
    }

    // Strategy 5: Show recent properties
    return await Property.find().sort({ createdAt: -1 }).limit(3);
  } catch (error) {
    console.error("❌ Alternative suggestions error:", error);
    return [];
  }
}

/**
 * Generate AI response using OpenAI API
 */
async function generateAIResponse(
  userMessage,
  properties,
  alternatives,
  conversationHistory = []
) {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.warn("⚠️ OPENAI_API_KEY not found - using enhanced fallback");
      return generateFallbackResponse(userMessage, properties, alternatives);
    }

    // Determine search result status
    let searchStatus = "";
    if (properties.length > 0) {
      searchStatus = "EXACT_MATCH";
    } else if (alternatives.length > 0) {
      searchStatus = "NO_EXACT_MATCH_BUT_ALTERNATIVES";
    } else {
      searchStatus = "NO_RESULTS";
    }

    // Build conversation messages
    const messages = [
      {
        role: "system",
        content: `You are an intelligent property assistant for Hi-Tech Homes real estate website. Your role is to:

1. Answer user questions naturally and conversationally
2. Help users find properties based on their specific requirements
3. Provide detailed information about properties, pricing, locations, and amenities
4. When no exact match found, politely inform user and suggest alternatives
5. Be friendly, helpful, and always respond directly to what the user asks

Company Information:
- Name: Hi-Tech Homes
- Phone: +91 98765 43210
- Email: info@hitechhomes.com
- Location: Mumbai, India
- Specialization: Premium residential properties

SEARCH STATUS: ${searchStatus}

${
  searchStatus === "EXACT_MATCH" && properties.length > 0
    ? `
✅ PERFECT MATCHES FOUND:
${properties
  .map(
    (p, i) => `
${i + 1}. ${p.title}
   💰 Price: ₹${p.price.toLocaleString()}
   🏠 Config: ${p.bhk} BHK, ${p.bathrooms} Bathrooms
   📍 Location: ${p.city}, ${p.address}
   📏 Area: ${p.area || "Not specified"}
   ✨ Amenities: ${p.amenities.join(", ") || "Basic amenities"}
`
  )
  .join("\n")}

Present these properties enthusiastically! These are exactly what the user is looking for! 🎉
`
    : ""
}

${
  searchStatus === "NO_EXACT_MATCH_BUT_ALTERNATIVES" && alternatives.length > 0
    ? `
⚠️ NO EXACT MATCHES for the user's specific requirements.

However, we have ALTERNATIVE SUGGESTIONS:
${alternatives
  .map(
    (p, i) => `
${i + 1}. ${p.title}
   💰 Price: ₹${p.price.toLocaleString()}
   🏠 Config: ${p.bhk} BHK, ${p.bathrooms} Bathrooms
   📍 Location: ${p.city}, ${p.address}
   📏 Area: ${p.area || "Not specified"}
   ✨ Amenities: ${p.amenities.join(", ") || "Basic amenities"}
`
  )
  .join("\n")}

IMPORTANT:
- First apologize that we don't have exact matches for their requirements
- Explain what's different (price, BHK, location)
- Present these alternatives as "close matches" or "similar options"
- Be encouraging: "You might also like..." or "Here are some great alternatives..."
- Ask if they'd like to adjust their budget/requirements
`
    : ""
}

${
  searchStatus === "NO_RESULTS"
    ? `
❌ NO PROPERTIES FOUND matching the user's query AND no suitable alternatives.

IMPORTANT:
- Politely apologize: "I'm sorry, we don't currently have properties matching your exact requirements."
- Suggest: Call +91 98765 43210 to discuss requirements
- Offer to notify them when matching properties become available
- Suggest they try: Different budget range, different BHK, different location
- Offer to show them our latest properties
- Be empathetic and helpful
`
    : ""
}

CONVERSATION STYLE:
- Be warm, friendly, and empathetic
- Answer questions directly and naturally
- Use emojis occasionally: 🏠 🔑 💰 📍 ✨ 😊
- When no match: be apologetic but helpful
- Always end with a helpful follow-up question or offer
- Keep responses concise but informative (2-4 sentences for most answers)
- For contact queries, provide: Phone: +91 98765 43210, Email: info@hitechhomes.com`,
      },
    ];

    // Add conversation history
    conversationHistory
      .filter((msg) => msg.type !== "system")
      .slice(-6)
      .forEach((msg) => {
        messages.push({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.text,
        });
      });

    // Add current message
    messages.push({
      role: "user",
      content: userMessage,
    });

    console.log("📤 Calling OpenAI API...");

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI API Error:", errorData);
      return generateFallbackResponse(userMessage, properties, alternatives);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log("✅ OpenAI response received");
      return data.choices[0].message.content;
    }

    console.error("❌ Unexpected OpenAI response format:", data);
    return generateFallbackResponse(userMessage, properties, alternatives);
  } catch (error) {
    console.error("❌ AI generation error:", error.message);
    return generateFallbackResponse(userMessage, properties, alternatives);
  }
}

/**
 * Enhanced fallback response when AI is unavailable
 */
function generateFallbackResponse(message, properties, alternatives) {
  const lowerMessage = message.toLowerCase();

  // Exact matches found
  if (properties.length > 0) {
    const p = properties[0];
    return `Great news! I found ${properties.length} ${
      properties.length === 1 ? "property" : "properties"
    } that match your requirements! 🎉\n\n📍 Top match: "${
      p.title
    }"\n💰 Price: ₹${p.price.toLocaleString()}\n🏠 ${p.bhk} BHK, ${
      p.bathrooms
    } Bath\n📍 Location: ${
      p.city
    }\n\nCheck out the property cards below for full details! Would you like to know more about any of these properties? 😊`;
  }

  // No exact match but alternatives available
  if (alternatives.length > 0) {
    const a = alternatives[0];
    return `I'm sorry, we don't have properties that exactly match your requirements right now. 😔\n\nHowever, I found ${
      alternatives.length
    } similar ${
      alternatives.length === 1 ? "property" : "properties"
    } you might like!\n\n📍 Closest match: "${
      a.title
    }"\n💰 ₹${a.price.toLocaleString()}\n🏠 ${a.bhk} BHK in ${
      a.city
    }\n\nWould you like to see these alternatives, or should I help you adjust your search? 🏠`;
  }

  // Specific keyword responses
  if (
    lowerMessage.includes("contact") ||
    lowerMessage.includes("phone") ||
    lowerMessage.includes("call") ||
    lowerMessage.includes("dealer")
  ) {
    return `📞 Contact Hi-Tech Homes:\n\n• Phone: +91 98765 43210\n• Email: info@hitechhomes.com\n• Location: Mumbai, India\n\nOur team is ready to assist you! You can also click on any property to contact the dealer directly. How else can I help you? 😊`;
  }

  if (
    lowerMessage.includes("amenities") ||
    lowerMessage.includes("features") ||
    lowerMessage.includes("facilities")
  ) {
    return `Our properties come with premium amenities:\n\n🅿️ Parking spaces\n🔒 24/7 Security\n🏋️ Gymnasium\n🏊 Swimming pool\n🌳 Landscaped gardens\n⚡ Power backup\n\nEach property has different amenities. Want to search for properties with specific features? 😊`;
  }

  if (
    lowerMessage.includes("visit") ||
    lowerMessage.includes("schedule") ||
    lowerMessage.includes("viewing") ||
    lowerMessage.includes("tour")
  ) {
    return `I'd love to help you schedule a property visit! 🏠\n\nPlease contact us:\n📱 Call: +91 98765 43210\n📧 Email: info@hitechhomes.com\n\nOr fill out the enquiry form on our Contact page. Our team will arrange a convenient time for you! What type of property are you interested in? 😊`;
  }

  if (
    lowerMessage.includes("about") ||
    lowerMessage.includes("who are you") ||
    lowerMessage.includes("company")
  ) {
    return `Hi-Tech Homes - Your trusted real estate partner! 🏡\n\nWe specialize in:\n✅ Premium residential properties\n✅ Expert property consultation\n✅ Transparent dealings\n✅ Customer satisfaction\n\n📞 Contact: +91 98765 43210\n📧 Email: info@hitechhomes.com\n\nHow can I help you find your dream home today? 😊`;
  }

  if (
    lowerMessage.includes("process") ||
    lowerMessage.includes("how to buy") ||
    lowerMessage.includes("procedure")
  ) {
    return `Our property buying process:\n\n1️⃣ Browse & shortlist properties\n2️⃣ Contact our dealer\n3️⃣ Schedule property visit\n4️⃣ Document verification\n5️⃣ Finalize the deal\n\nOur expert team guides you through each step! 📞 Call +91 98765 43210 for personalized assistance. What type of property interests you? 😊`;
  }

  // No results - property search related
  if (
    lowerMessage.includes("bhk") ||
    lowerMessage.includes("lakh") ||
    lowerMessage.includes("crore") ||
    lowerMessage.includes("property") ||
    lowerMessage.includes("flat")
  ) {
    return `I apologize, but we don't currently have properties matching your specific requirements. 😔\n\nLet me help you find alternatives:\n• Adjust your budget range? 💰\n• Try different BHK? 🏠\n• Explore other locations? 📍\n• See our latest properties?\n\n📞 Call us at +91 98765 43210 and we'll find the perfect match for you! What would you prefer? 😊`;
  }

  // Greetings
  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey") ||
    lowerMessage === "hi"
  ) {
    return "Hello! 👋 Welcome to Hi-Tech Homes! I'm here to help you find your dream property. What are you looking for today? 🏠";
  }

  // Thanks
  if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
    return "You're very welcome! 😊 If you have any more questions about properties, feel free to ask. Happy house hunting! 🏠✨";
  }

  // Default helpful response
  return `I'm here to help you find your perfect property! 🏠\n\nYou can ask me:\n• "Show me 2 BHK under 50 lakh"\n• "Properties in Mumbai"\n• "What amenities are available?"\n• "Contact information"\n• "Schedule a property visit"\n\n📞 Or call us: +91 98765 43210\n\nWhat can I help you with? 😊`;
}

module.exports = exports;
