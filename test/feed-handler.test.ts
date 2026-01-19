const sendMock = jest.fn();
const parseUrlMock = jest.fn();

jest.mock(
    "@aws-sdk/client-s3",
    () => ({
        S3Client: jest.fn(() => ({ send: sendMock })),
        PutObjectCommand: jest.fn((input: unknown) => ({ input })),
    }),
    { virtual: true },
);

jest.mock(
    "rss-parser",
    () =>
        jest.fn().mockImplementation(() => ({
            parseURL: parseUrlMock,
        })),
    { virtual: true },
);

import { handler } from "../lambda/index";

describe("feed handler", () => {
    const env = process.env;

    beforeEach(() => {
        process.env = {
            ...env,
            AWS_REGION: "us-east-1",
            BUCKET_NAME: "test-bucket",
            FEED_URL: "https://example.com/feed",
        };
        sendMock.mockResolvedValue({});
        parseUrlMock.mockResolvedValue({
            title: "Test Feed",
            items: [
                {
                    title: "Item 1",
                    link: "https://example.com/1",
                    pubDate: "Sat, 17 Jan 2026 14:15:35 GMT",
                    contentSnippet: "Snippet 1",
                },
            ],
        });
    });

    afterEach(() => {
        process.env = env;
        jest.clearAllMocks();
    });

    it("handles scheduled events", async () => {
        const result = await handler({ source: "aws.events" });

        expect(result).toBeUndefined();
        expect(parseUrlMock).toHaveBeenCalledWith("https://example.com/feed");
        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it("handles API POST requests", async () => {
        const result = await handler({
            httpMethod: "POST",
            requestContext: { requestId: "request-1" },
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify({ message: "Feed written to s3" }),
        });
        expect(parseUrlMock).toHaveBeenCalledWith("https://example.com/feed");
        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it("rejects non-POST API requests", async () => {
        const result = await handler({ httpMethod: "GET" });

        expect(result).toEqual({
            statusCode: 405,
            body: JSON.stringify({ message: "method not allowed" }),
        });
        expect(parseUrlMock).not.toHaveBeenCalled();
        expect(sendMock).not.toHaveBeenCalled();
    });

    it("throws for unsupported events", async () => {
        await expect(handler({})).rejects.toThrow("unhandled event type");

        expect(parseUrlMock).not.toHaveBeenCalled();
        expect(sendMock).not.toHaveBeenCalled();
    });
});
