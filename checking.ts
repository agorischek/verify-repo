import { plugin } from "verify-repo";

export const hello = () =>
  plugin({
    name: "Hello",
    description: "A friendly plugin.",
    docs: [
      {
        signature: 'verify.hello("name").greets()',
        description: "Checks that the hello greeting is received.",
      },
    ],
    api: ({ root }) => ({
      hello: ({ entry, register }) =>
        entry({
          greets: (name: string) => {
            register(`says hello to ${name}`, async ({ pass }) => {
              pass(`Hello, ${name}! (from ${root ?? process.cwd()})`);
            });
          },
        }),
    }),
  });
