import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Parser from "rss-parser";

interface LambdaEvent {
    httpMethod?: string;
    source?: string;
    body?: string;
}

interface RSSPost {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
}

const s3 = new S3Client();
const parser = new Parser();

export const handler = async (event: LambdaEvent) => {
    console.log("Handler invoked");
    console.log(`Event: ${JSON.stringify(event)}`);

    try {
        const isScheduledEvent = event.source === "aws.events";
        const isPostRequest = event.httpMethod === "POST";

        if (!isScheduledEvent && !isPostRequest) {
            return {
                statusCode: 405,
                body: JSON.stringify({ message: "method not allowed" }),
            };
        }

        const feedUrl = process.env.FEED_URL || "";
        const bucketName = process.env.BUCKET_NAME || "";

        if (!feedUrl || !bucketName) {
            throw new Error("missing feed url and/or bucket name");
        }

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

        await s3.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: "feed.json",
                Body: JSON.stringify(posts, null, 2),
                ContentType: "application/json",
            }),
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Feed written to s3" }),
        };
    } catch (error) {
        console.error(`Error processing request: ${error}`);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: error }),
        };
    }
};
