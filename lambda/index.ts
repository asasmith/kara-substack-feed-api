import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Parser from "rss-parser";

interface ApiGatewayEvent {
    httpMethod: string;
    body?: string;
    requestContext?: {
        requestId?: string;
    };
}

interface ScheduledEvent {
    source: "aws.events";
}

interface UnsupportedEvent {
    source?: string;
    httpMethod?: string;
    body?: string;
    requestContext?: {
        requestId?: string;
    };
}

type LambdaEvent = ApiGatewayEvent | ScheduledEvent | UnsupportedEvent;

interface RSSPost {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
}

const s3 = new S3Client({ region: process.env.AWS_REGION });
const parser = new Parser();

const log = (
    level: "info" | "warn" | "error",
    message: string,
    context: Record<string, unknown> = {},
) => {
    const payload = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...context,
    };

    if (level === "error") {
        console.error(payload);
    } else if (level === "warn") {
        console.warn(payload);
    } else {
        console.log(payload);
    }
};

const isScheduledEvent = (event: LambdaEvent): event is ScheduledEvent =>
    (event as ScheduledEvent).source === "aws.events";

const isApiEvent = (event: LambdaEvent): event is ApiGatewayEvent =>
    typeof (event as ApiGatewayEvent).httpMethod === "string";

export const handler = async (event: LambdaEvent) => {
    const scheduledEvent = isScheduledEvent(event);
    const apiEvent = isApiEvent(event);
    const requestId = apiEvent ? event.requestContext?.requestId : undefined;
    const eventType = scheduledEvent ? "scheduled" : apiEvent ? "api" : "unknown";

    log("info", "Handler invoked", {
        eventType,
        httpMethod: apiEvent ? event.httpMethod : undefined,
        requestId,
    });

    try {
        const isPostRequest = apiEvent && event.httpMethod === "POST";
        const isValidEvent = scheduledEvent || isPostRequest;

        if (!isValidEvent) {
            if (apiEvent) {
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: "method not allowed" }),
                };
            }

            log("error", "Unhandled event type", {
                eventType,
                requestId,
            });
            throw new Error("Unhandled event type");
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

        if (apiEvent) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Feed written to s3" }),
            };
        }

        log("info", "Feed written to s3", { requestId });
        return;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        log("error", "Error processing request", {
            errorMessage,
            requestId,
        });

        if (apiEvent) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Internal server error" }),
            };
        }

        return;
    }
};
