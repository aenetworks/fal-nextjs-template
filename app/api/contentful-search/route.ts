import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'contentful';

// Create Contentful client
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || 'my-space-id', // Will use environment variable or fallback
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || 'access-token', // Will use environment variable or fallback
});

function sanitizeContentForAI(text) {
  // Use compromise to identify people's names
  let doc = compromise(text);
  
  // Get people, organizations, and places
  let people = doc.people().out('array');
  let orgs = doc.organizations().out('array');
  let places = doc.places().out('array');
  
  console.log("Detected people:", JSON.stringify(people));
  console.log("Detected organizations:", JSON.stringify(orgs));
  
  // Create a map to store replacements for consistency
  let replacementMap = {};
  
  // Process people names first
  people.forEach(person => {
    // Skip common words that might be misidentified as names
    if (['The', 'I', 'You', 'We', 'They'].includes(person)) {
      return;
    }
    
    // Clean the entity name from trailing punctuation
    const cleanPerson = person.replace(/[,;:.!?]$/, '').trim();
    if (!cleanPerson) return;
    
    // Create a replacement
    const nameParts = cleanPerson.split(/\s+/);
    if (nameParts.length === 1) {
      replacementMap[cleanPerson] = "the individual";
    } else {
      replacementMap[cleanPerson] = "the historical figure";
    }
  });
  
  // Process organizations
  orgs.forEach(org => {
    // Clean the entity name
    const cleanOrg = org.replace(/[,;:.!?]$/, '').trim();
    if (!cleanOrg) return;
    
    // Don't replace if it's a place
    if (places.some(place => place.includes(cleanOrg) || cleanOrg.includes(place))) {
      return;
    }
    
    replacementMap[cleanOrg] = "the company";
  });
  
  // Sort replacements by length (longest first) to prevent partial replacements
  const sortedEntities = Object.keys(replacementMap).sort((a, b) => b.length - a.length);
  
  // Apply replacements
  let sanitizedText = text;
  sortedEntities.forEach(entity => {
    // Escape special regex characters in the entity name
    const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex that handles word boundaries but also catches names with punctuation
    const regex = new RegExp(`\\b${escapedEntity}\\b|${escapedEntity}(?=,|;|\\.|:|\\?|!)`, 'g');
    
    sanitizedText = sanitizedText.replace(regex, replacementMap[entity]);
  });
  
  console.log("Applied replacements:", JSON.stringify(replacementMap));
  return sanitizedText;
}

function extractTextFromJson(jsonData) {
  let fullText = "";
  
  // Process document content, which is an array of blocks
  if (jsonData.content && Array.isArray(jsonData.content)) {
    jsonData.content.forEach(block => {
      // Skip embedded-entry-block which doesn't contain text
      if (block.nodeType === "embedded-entry-block") {
        return;
      }
      
      // Process paragraph blocks
      if (block.nodeType === "paragraph" && block.content) {
        const paragraphText = extractTextFromContent(block.content);
        if (paragraphText) {
          fullText += paragraphText + "\n";
        }
      }
    });
  }
  
  return fullText;
}

function extractTextFromContent(contentArray) {
  let text = "";
  
  if (!Array.isArray(contentArray)) {
    return text;
  }
  
  contentArray.forEach(item => {
    if (item.nodeType === "text" && item.value) {
      text += item.value;
    } else if (item.nodeType === "hyperlink" && item.content) {
      // For hyperlinks, extract text from their content
      text += extractTextFromContent(item.content);
    }
  });
  
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }
    
    // Query Contentful for the entry with the given slug
    console.error(slug);
    const response = await client.getEntries({
      'query': slug
    });
    
    // Check if we got any results
    if (response.items.length === 0) {
      return NextResponse.json(
        { error: 'No content found for this slug' },
        { status: 404 }
      );
    }
    
    const contentData = response.items[0].fields.content;

    let fullText = extractTextFromJson(contentData);

    if (!fullText) {
      fullText = "no description found";
    }

    fullText = sanitizeContentForAI(fullText);
    
    return NextResponse.json({ fullText });
    
  } catch (err) {
    console.error('Error fetching from Contentful:', err);
    return NextResponse.json(
      { error: 'Failed to fetch content from Contentful' },
      { status: 500 }
    );
  }
}

export const OPTIONS = async (request: NextRequest) => {
  return new NextResponse('', {
    status: 200
  })
}