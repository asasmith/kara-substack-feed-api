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
    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = https.request(options, (res) => {
        let rawData = "";

        res.on("data", (chunk) => {
          rawData += chunk;
        });

        res.on("end", () => {
          console.log("Substack status:", res.statusCode);
          console.log("Substack response body:", rawData);
          resolve(rawData);
        });
      });

      req.on("error", (e) => {
        console.error("Error calling Substack:", e);
        reject(e);
      });

      req.write(data);
      req.end();
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Subscribed", substackResponse: responseBody }),
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
