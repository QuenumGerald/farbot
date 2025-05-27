import dotenv from 'dotenv';
dotenv.config();

import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { FeedType } from "@neynar/nodejs-sdk/build/api/index.js";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

async function fetchFollowingFeed() {
  try {
    const feedType = FeedType.Following;
    const fid = 3; // Dan Romero
    const limit = 1;
    const feed = await client.fetchFeed({ fid, feedType, limit });
    console.log("User Feed:", feed);
  } catch (err) {
    console.error("Erreur Neynar SDK:", err.message || err);
  }
}

fetchFollowingFeed();
