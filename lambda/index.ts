import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Parser from "rss-parser";

interface LambdaEvent {
    httpMethod?: string;
    source?: string;
    body?: string;
    requestContext?: {
        requestId?: string;
    };
}

interface RSSPost {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
}

const s3 = new S3Client({ region: process.env.AWS_REGION });
const parser = new Parser();

export const handler = async (event: LambdaEvent) => {
    const isScheduledEvent = event.source === "aws.events";
    const isApiEvent = typeof event.httpMethod === "string";
    const requestId = event.requestContext?.requestId;

    console.log("Handler invoked", {
        isScheduledEvent,
        isApiEvent,
        httpMethod: event.httpMethod,
        requestId,
    });

    try {
        if (!isScheduledEvent && !(isApiEvent && event.httpMethod === "POST")) {
            if (isApiEvent) {
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: "method not allowed" }),
                };
            }

            console.warn("Unhandled event type", { source: event.source, requestId });
            return;
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

        if (isApiEvent) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Feed written to s3" }),
            };
        }

        console.log("Feed written to s3", { requestId });
        return;
    } catch (error) {
        console.error("Error processing request", { error, requestId });

        if (isApiEvent) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Internal server error" }),
            };
        }

        return;
    }
};
