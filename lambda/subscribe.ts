export const handler = async (event: any) => {
  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email is required" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      };
    }

    const substackResponse = await fetch(
      "https://kararedman.substack.com/api/v1/free",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ email }),
        redirect: "manual",
      },
    );

    const responseText = await substackResponse.text();

    console.log("Substack response status:", substackResponse.status);
    console.log("Substack response body:", responseText);

    return {
      statusCode: substackResponse.status,
      body: responseText,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Subscribe error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    };
  }
};
