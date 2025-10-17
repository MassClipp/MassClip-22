"""
Marketplace Bundle Seeder
Generates realistic bundle data to populate the marketplace using AI
"""

import os
import json
import random
from datetime import datetime, timedelta
from groq import Groq

# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Bundle categories and niches
CATEGORIES = [
    "Video Editing",
    "Motion Graphics",
    "Sound Effects",
    "Music Loops",
    "Stock Footage",
    "3D Assets",
    "Color Presets",
    "Transitions",
    "Lower Thirds",
    "Intro Templates"
]

NICHES = [
    "Fitness & Wellness",
    "Tech Reviews",
    "Gaming",
    "Travel Vlogs",
    "Cooking & Food",
    "Fashion & Beauty",
    "Business & Finance",
    "Education",
    "Music Production",
    "Photography"
]

def generate_bundle_data(category, niche, index):
    """Generate realistic bundle data using AI"""
    
    prompt = f"""Generate a realistic content bundle for a creator marketplace. 
    
Category: {category}
Niche: {niche}

Create a JSON object with:
- title: Creative, specific bundle name (e.g., "Cinematic Travel LUTs Pack", "Gym Motivation Sound Effects")
- description: 2-3 sentences describing what's included and who it's for
- creatorName: Realistic creator name (first + last name)
- creatorUsername: Username based on their name (lowercase, no spaces)
- price: Random price between $9-$99
- contentCount: Random number between 10-50 items
- tags: 3-5 relevant tags

Make it sound professional and appealing. Return ONLY valid JSON, no markdown."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        # Remove markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        data = json.loads(content)
        
        # Add additional fields
        data["category"] = category
        data["niche"] = niche
        data["rating"] = round(random.uniform(4.2, 5.0), 1)
        data["reviewCount"] = random.randint(5, 250)
        data["salesCount"] = random.randint(10, 500)
        data["thumbnailQuery"] = f"{category.lower()} {niche.lower()} content bundle"
        
        # Random creation date within last 6 months
        days_ago = random.randint(1, 180)
        data["createdAt"] = (datetime.now() - timedelta(days=days_ago)).isoformat()
        
        print(f"✅ Generated bundle {index + 1}: {data['title']}")
        return data
        
    except Exception as e:
        print(f"❌ Error generating bundle {index + 1}: {e}")
        return None

def main():
    """Generate and save bundle data"""
    print("🚀 Starting marketplace bundle generation...")
    print(f"📊 Generating 50 bundles across {len(CATEGORIES)} categories")
    
    bundles = []
    
    for i in range(50):
        category = random.choice(CATEGORIES)
        niche = random.choice(NICHES)
        
        bundle = generate_bundle_data(category, niche, i)
        if bundle:
            bundles.append(bundle)
        
        # Rate limiting - wait a bit between requests
        import time
        time.sleep(0.5)
    
    # Save to JSON file
    output_file = "marketplace-bundles.json"
    with open(output_file, "w") as f:
        json.dump(bundles, f, indent=2)
    
    print(f"\n✅ Successfully generated {len(bundles)} bundles")
    print(f"📁 Saved to {output_file}")
    print("\n📊 Summary:")
    print(f"   - Categories: {len(set(b['category'] for b in bundles))}")
    print(f"   - Average price: ${sum(b['price'] for b in bundles) / len(bundles):.2f}")
    print(f"   - Total content items: {sum(b['contentCount'] for b in bundles)}")

if __name__ == "__main__":
    main()
