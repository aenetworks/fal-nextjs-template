import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: 'aenetworks',
  api_key: process.env.CLOUDINARY_API_KEY || 'abc',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abc',
});

export async function POST(request: Request) {
  try {
    const { query = 'nature', maxResults = 20 } = await request.json();
    
    const result = await cloudinary.search
      .expression(query)
      .sort_by('created_at', 'desc')
      .max_results(maxResults)
      .execute();

    // Return a random image URL from the results
    if (result.resources.length > 0) {
      const randomIndex = Math.floor(Math.random() * result.resources.length);
      const randomImage = result.resources[randomIndex];
      return NextResponse.json({ imageUrl: randomImage.secure_url });
    } else {
      return NextResponse.json(
        { error: 'No images found' },
        { status: 404 }
      );
    }
  } catch (err) {
    console.error('Error searching for images:', err);
    return NextResponse.json(
      { error: 'Failed to fetch images from Cloudinary' },
      { status: 500 }
    );
  }
}