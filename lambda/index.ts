import { S3 } from "aws-sdk";
import Parser from "rss-parser";

interface LambdaEvent {
  httpMethod: string;
  body?: string;
}

interface RSSPost {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
}

const s3 = new S3();
const parser = new Parser();

export const handler = async (event: LambdaEvent) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "method not allowed" }),
      };
    }

    const feedUrl = process.env.FEED_URL || "";
    const bucketName = process.env.BUCKET_NAME || "";

    const feed = await parser.parseURL(feedUrl);

    console.log(`Feed title: ${feed.title}`);
    console.log(`Feed items: ${feed.items?.length}`);


    const posts: RSSPost[] = feed.items.slice(0, 5).map((item: any) => {
      const { title, link, pubDate, contentSnippet } = item;
      return {
        title,
        link,
        pubDate,
        contentSnippet,
      };
    });

    await s3
      .putObject({
        Bucket: bucketName,
        Key: "feed.json",
        Body: JSON.stringify(posts, null, 2),
        ContentType: "application/json",
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Feed written to s3" }),
    };
  } catch (error) {
    console.error(`Error processing request: ${error}`);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
