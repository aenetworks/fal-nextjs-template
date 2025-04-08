import { NextResponse } from 'next/server';
import { createClient } from 'contentful';

// Create Contentful client
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || 'my-space-id', // Will use environment variable or fallback
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || 'access-token', // Will use environment variable or fallback
});

export async function POST(request: Request) {
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
    
    // Extract the OpenGraph description
    // Note: The path to openGraphDescription may vary based on your Contentful content model
    // We try both common paths
    let openGraphDescription;
    
    try {
      // Try direct path first
      openGraphDescription = response.items[0].fields.openGraphDescription;
      
      // If not found, try nested path
      if (!openGraphDescription) {
        openGraphDescription = "no description found";
      }
    } catch (e) {
      console.error('Error extracting openGraphDescription:', e);
    }
    
    if (!openGraphDescription) {
      return NextResponse.json(
        { error: 'No openGraphDescription found in content' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ openGraphDescription });
    
  } catch (err) {
    console.error('Error fetching from Contentful:', err);
    return NextResponse.json(
      { error: 'Failed to fetch content from Contentful' },
      { status: 500 }
    );
  }
}