import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'contentful';

// Create Contentful client
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || 'my-space-id', // Will use environment variable or fallback
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || 'access-token', // Will use environment variable or fallback
});

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