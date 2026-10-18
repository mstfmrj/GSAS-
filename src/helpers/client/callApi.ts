/**
 * src/helpers/client/callApi.ts
 *
 * PURPOSE:
 * Frontend HTTP fetch wrapper adding authorization headers, error handling, and JSON parsing.
 */

export async function callApi(
  url: string,
  data: Record<string, any> = {},
  isPost = true,
  withAuth = true
) {
  const options: RequestInit = {
    method: isPost ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: withAuth ? "include" : "same-origin",
  };

  if (isPost) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || `Request failed with status ${response.status}`);
  }

  return json;
}

export default callApi;
