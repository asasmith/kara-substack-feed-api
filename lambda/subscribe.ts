import * as https from "https";
import { APIGatewayProxyEvent } from "aws-lambda";

export const handler = async function (event: APIGatewayProxyEvent) {
  const body = event.body ? JSON.parse(event.body) : {};
  const email = body.email;

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email is required" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }

  const data = JSON.stringify({ email });

  const options: https.RequestOptions = {
    hostname: "saturday-paper.kararedman.com",
    path: "/api/v1/free",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const req = https.request(options, (res) => {
        res.on("data", () => {});
        res.on("end", resolve);
      });

      req.on("error", reject);
      req.write(data);
      req.end();
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Subscribed" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    console.error("Subscription error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Subscription failed" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};
