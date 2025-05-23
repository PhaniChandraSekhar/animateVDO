import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.217.0/testing/asserts.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleRequest } from "./index.ts"; // Adjust path as necessary

// --- Mock Supabase Client ---
interface MockSupabaseClientOptions {
  projectUpdateShouldFail?: boolean;
  progressUpdateShouldFail?: boolean;
  genericDbError?: boolean; // For simulating other types of DB errors if needed
}

function createMockSupabaseClient(
  options: MockSupabaseClientOptions = {},
): SupabaseClient {
  let updatedProjectData: any = null;
  let updatedProgressData: any = null;
  let projectUpdateCalledWith: any = null;
  let progressUpdateCalledWith: any = null;

  const client = {
    from: (tableName: string) => {
      return {
        update: (data: any) => {
          if (tableName === "projects") {
            updatedProjectData = data;
          } else if (tableName === "story_progress") {
            updatedProgressData = data;
          }
          return {
            eq: (column: string, value: any) => {
              if (tableName === "projects") {
                projectUpdateCalledWith = { data, column, value };
                if (options.projectUpdateShouldFail || options.genericDbError) {
                  return Promise.resolve({
                    error: new Error("Mock DB error updating projects"),
                    data: null,
                  });
                }
              } else if (tableName === "story_progress") {
                progressUpdateCalledWith = { data, column, value };
                if (options.progressUpdateShouldFail || options.genericDbError) {
                  return Promise.resolve({
                    error: new Error("Mock DB error updating story_progress"),
                    data: null,
                  });
                }
              }
              return Promise.resolve({ error: null, data: [{}] });
            },
          };
        },
      };
    },
    // Expose captured data for assertions
    _getUpdatedProjectData: () => updatedProjectData,
    _getProjectUpdateCalledWith: () => projectUpdateCalledWith,
    _getUpdatedProgressData: () => updatedProgressData,
    _getProgressUpdateCalledWith: () => progressUpdateCalledWith,
  } as any; // Cast to any to add helper methods for tests

  return client as SupabaseClient;
}

// --- Test Suites ---
Deno.test("AI Research Edge Function - Test Scenarios", async (t) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Authorization": "Bearer test-token", // Mock auth token
  };

  await t.step("OPTIONS request should return 200 OK", async () => {
    const mockClient = createMockSupabaseClient();
    const request = new Request("http://localhost/ai-research", {
      method: "OPTIONS",
    });
    const response = await handleRequest(request, mockClient);
    assertEquals(response.status, 200);
    const text = await response.text();
    assertEquals(text, "ok");
    assert(response.headers.get("Access-Control-Allow-Origin") === "*");
  });

  await t.step(
    "Successful research and update",
    async () => {
      const mockClient = createMockSupabaseClient();
      const requestBody = { project_id: "proj_123", topic: "test_success" };
      const request = new Request("http://localhost/ai-research", {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(requestBody),
      });

      const response = await handleRequest(request, mockClient);
      const responseJson = await response.json();

      assertEquals(response.status, 200);
      assertExists(responseJson.summary);
      assertEquals(
        responseJson.summary,
        "This is a mock summary for the topic: test_success.",
      );
      assertExists(responseJson.key_points);
      assertExists(responseJson.sources);

      // Check database calls
      const projectCall = (mockClient as any)._getProjectUpdateCalledWith();
      assertExists(projectCall);
      assertEquals(projectCall.value, "proj_123"); // project_id
      assertEquals(projectCall.data.research_data.summary, responseJson.summary);

      const progressCall = (mockClient as any)._getProgressUpdateCalledWith();
      assertExists(progressCall);
      assertEquals(progressCall.value, "proj_123"); // project_id
      assertEquals(progressCall.data.research, true);
    },
  );

  await t.step("Research service error (topic: test_error)", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { project_id: "proj_456", topic: "test_error" };
    const request = new Request("http://localhost/ai-research", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(
      responseJson.error,
      "Simulated error from research service for topic: test_error",
    );

    // Ensure DB calls were not made
    assert(!((mockClient as any)._getProjectUpdateCalledWith()), "Project update should not have been called");
    assert(!((mockClient as any)._getProgressUpdateCalledWith()), "Progress update should not have been called");

  });

  await t.step("Database error on projects table update", async () => {
    const mockClient = createMockSupabaseClient({
      projectUpdateShouldFail: true,
    });
    const requestBody = { project_id: "proj_789", topic: "test_success" };
    const request = new Request("http://localhost/ai-research", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(
      responseJson.error,
      "Failed to update project research data: Mock DB error updating projects",
    );
     // Ensure progress update was not called
    assert(!((mockClient as any)._getProgressUpdateCalledWith()), "Progress update should not have been called after project update failure");
  });

  await t.step("Database error on story_progress table update", async () => {
    const mockClient = createMockSupabaseClient({
      progressUpdateShouldFail: true,
    });
    const requestBody = { project_id: "proj_101", topic: "test_success" };
    const request = new Request("http://localhost/ai-research", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(
      responseJson.error,
      "Failed to update story progress: Mock DB error updating story_progress",
    );
     // Project update should have been called
    assertExists((mockClient as any)._getProjectUpdateCalledWith());
  });


  await t.step("Invalid input - missing project_id", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { topic: "test_success" }; // Missing project_id
    const request = new Request("http://localhost/ai-research", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 400);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "project_id is required.");
  });

  await t.step("Invalid input - missing topic", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { project_id: "proj_123" }; // Missing topic
    const request = new Request("http://localhost/ai-research", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 400);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "topic is required.");
  });

   await t.step("Generic research data for non-specific topic", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { project_id: "proj_generic", topic: "some_other_topic" };
    const request = new Request("http://localhost/ai-research", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 200);
    assertEquals(
      responseJson.summary,
      "No specific mock data for topic: some_other_topic. Generic response.",
    );
    assertEquals(responseJson.key_points.length, 0);
    assertEquals(responseJson.sources.length, 0);

    // Check database calls
    const projectCall = (mockClient as any)._getProjectUpdateCalledWith();
    assertExists(projectCall);
    assertEquals(projectCall.value, "proj_generic");

    const progressCall = (mockClient as any)._getProgressUpdateCalledWith();
    assertExists(progressCall);
    assertEquals(progressCall.value, "proj_generic");
    assertEquals(progressCall.data.research, true);
  });

});
console.log("Supabase Edge Function tests created: supabase/functions/ai-research/index.test.ts");

// To run these tests:
// Ensure Deno is installed.
// Navigate to the root of your Supabase project in the terminal.
// Set required environment variables for the main index.ts if it tries to create a real client (though our tests use mocks).
// For example:
// export SUPABASE_URL="http://localhost:54321"
// export SUPABASE_ANON_KEY="your_anon_key"
// Then run:
// deno test --allow-env --allow-net supabase/functions/ai-research/index.test.ts
// (or adjust the path if your CWD is different)
// The --allow-net might be needed if any part of your code (even un-mocked) tries to make network requests.
// --allow-env is needed because the main index.ts (outside handleRequest) tries to read Deno.env.
// Ideally, the main `serve` part in index.ts would also be more defensive about env vars if they are only needed for client creation,
// but for testing `handleRequest` directly, it's fine.
