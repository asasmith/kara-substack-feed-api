import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
const { TABLE_NAME } = process.env;

export const handler = async (event: any) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing request body." }),
      };
    }

    const { email } = JSON.parse(event.body);
    const isValidEmail = validateEmail(email);

    if (!isValidEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid email." }),
      };
    }

    const timestamp = new Date().toISOString();

    const putCommand = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        email: { S: email },
        createdAt: { S: timestamp },
        subscribed: { BOOL: false },
      },
    });

    await client.send(putCommand);
  } catch (error) {
        console.error(`Error: ${error}`)

        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
