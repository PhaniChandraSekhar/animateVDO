import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.217.0/testing/asserts.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleScriptRequest } from "./index.ts"; // Adjust path as necessary
import type { ResearchDataInput } from "./index.ts"; // Import type if needed

// --- Mock Supabase Client ---
interface MockSupabaseClientOptions {
  // --- Project Table Mocking ---
  // For fetching research_data
  mockResearchData?: ResearchDataInput | null; // Data to return for select('research_data')
  fetchResearchDataShouldFail?: boolean;
  // For updating script_data
  scriptUpdateShouldFail?: boolean;

  // --- Story Progress Table Mocking ---
  progressUpdateShouldFail?: boolean;
}

function createMockSupabaseClient(
  options: MockSupabaseClientOptions = {},
): SupabaseClient {
  let capturedData: {
    selectResearchArgs?: any;
    updateScriptArgs?: any;
    updateProgressArgs?: any;
  } = {};

  const client = {
    from: (tableName: string) => {
      if (tableName === "projects") {
        return {
          select: (selectValue: string) => {
            capturedData.selectResearchArgs = { tableName, selectValue };
            return {
              eq: (column: string, value: any) => {
                capturedData.selectResearchArgs.eq = { column, value };
                if (options.fetchResearchDataShouldFail) {
                  return Promise.resolve({
                    error: new Error("Mock DB error fetching research data"),
                    data: null,
                  });
                }
                return Promise.resolve({
                  error: null,
                  data: options.mockResearchData === null
                    ? null
                    : { research_data: options.mockResearchData, id: value },
                });
              },
              single: () => { // Assuming .single() is used after .eq() for fetching one project
                if (options.fetchResearchDataShouldFail) {
                  return Promise.resolve({
                    error: new Error("Mock DB error fetching single research data"),
                    data: null,
                  });
                }
                 const projectData = options.mockResearchData === null ? null : { research_data: options.mockResearchData };
                 return Promise.resolve({ error: null, data: projectData });
              }
            };
          },
          update: (dataToUpdate: any) => {
            capturedData.updateScriptArgs = { tableName, dataToUpdate };
            return {
              eq: (column: string, value: any) => {
                capturedData.updateScriptArgs.eq = { column, value };
                if (options.scriptUpdateShouldFail) {
                  return Promise.resolve({
                    error: new Error("Mock DB error storing script_data"),
                    data: null,
                  });
                }
                return Promise.resolve({ error: null, data: [{}] });
              },
            };
          },
        };
      } else if (tableName === "story_progress") {
        return {
          update: (dataToUpdate: any) => {
            capturedData.updateProgressArgs = { tableName, dataToUpdate };
            return {
              eq: (column: string, value: any) => {
                capturedData.updateProgressArgs.eq = { column, value };
                if (options.progressUpdateShouldFail) {
                  return Promise.resolve({
                    error: new Error("Mock DB error updating story_progress"),
                    data: null,
                  });
                }
                return Promise.resolve({ error: null, data: [{}] });
              },
            };
          },
        };
      }
      // Fallback for other tables if any, though not expected for these tests
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ error: new Error("Unexpected table select"), data: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: new Error("Unexpected table update"), data: null }) }),
      };
    },
    // Helper to get captured data for assertions
    _getCapturedData: () => capturedData,
  } as any;

  return client as SupabaseClient;
}

// --- Test Suites ---
Deno.test("AI Scriptwriting Edge Function - Test Scenarios", async (t) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Authorization": "Bearer test-token",
  };
  const sampleResearchData: ResearchDataInput = {
    summary: "A tale of space exploration and discovery.",
    key_points: ["Point A", "Point B"],
    sources: ["source_alpha.com"],
  };
   const sampleResearchDataForLlmError: ResearchDataInput = {
    summary: "test_error_script",
  };

  await t.step("OPTIONS request should return 200 OK", async () => {
    const mockClient = createMockSupabaseClient();
    const request = new Request("http://localhost/ai-scriptwriting", { method: "OPTIONS" });
    const response = await handleScriptRequest(request, mockClient);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "ok");
  });

  await t.step("Successful script generation (research_data provided)", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { project_id: "proj_provided_rd", research_data: sampleResearchData };
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 200);
    assertExists(responseJson.title);
    assertExists(responseJson.logline);
    assertExists(responseJson.scenes);
    assertEquals(responseJson.title, `Script based on: ${sampleResearchData.summary.substring(0, 30)}...`);

    const captured = (mockClient as any)._getCapturedData();
    assertExists(captured.updateScriptArgs);
    assertEquals(captured.updateScriptArgs.eq.value, "proj_provided_rd");
    assertEquals(captured.updateScriptArgs.dataToUpdate.script_data.title, responseJson.title);
    assertExists(captured.updateProgressArgs);
    assertEquals(captured.updateProgressArgs.eq.value, "proj_provided_rd");
    assertEquals(captured.updateProgressArgs.dataToUpdate.script, true);
  });

  await t.step("Successful script generation (research_data fetched from DB)", async () => {
    const mockClient = createMockSupabaseClient({ mockResearchData: sampleResearchData });
    const requestBody = { project_id: "proj_fetched_rd" }; // No research_data in request
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 200);
    assertEquals(responseJson.title, `Script based on: ${sampleResearchData.summary.substring(0, 30)}...`);

    const captured = (mockClient as any)._getCapturedData();
    assertExists(captured.selectResearchArgs);
    assertEquals(captured.selectResearchArgs.eq.value, "proj_fetched_rd");
    assertExists(captured.updateScriptArgs);
    assertExists(captured.updateProgressArgs);
  });

  await t.step("Error: Research data not found (when fetching from DB)", async () => {
    const mockClient = createMockSupabaseClient({ mockResearchData: null }); // Simulate DB returning null for project
    const requestBody = { project_id: "proj_not_found_rd" };
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 404);
    assertExists(responseJson.error);
    assertStringIncludes(responseJson.error, "Research data not found for project proj_not_found_rd");
  });
  
  await t.step("Error: Fetching research_data from DB fails", async () => {
    const mockClient = createMockSupabaseClient({ fetchResearchDataShouldFail: true });
    const requestBody = { project_id: "proj_fetch_fail_rd" };
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();
    
    assertEquals(response.status, 500); // Error thrown by handler is 500
    assertExists(responseJson.error);
    assertStringIncludes(responseJson.error, "Failed to fetch research data");
  });


  await t.step("Error: Mock LLM call fails", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { project_id: "proj_llm_fail", research_data: sampleResearchDataForLlmError };
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "Simulated LLM error during script generation.");
  });

  await t.step("Error: DB update fails (storing script_data)", async () => {
    const mockClient = createMockSupabaseClient({ scriptUpdateShouldFail: true });
    const requestBody = { project_id: "proj_script_db_fail", research_data: sampleResearchData };
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "Failed to store script data: Mock DB error storing script_data");
  });

  await t.step("Error: DB update fails (updating story_progress)", async () => {
    const mockClient = createMockSupabaseClient({ progressUpdateShouldFail: true });
    const requestBody = { project_id: "proj_progress_db_fail", research_data: sampleResearchData };
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "Failed to update script progress: Mock DB error updating story_progress");
  });

  await t.step("Invalid input - missing project_id", async () => {
    const mockClient = createMockSupabaseClient();
    const requestBody = { research_data: sampleResearchData }; // Missing project_id
    const request = new Request("http://localhost/ai-scriptwriting", {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    });

    const response = await handleScriptRequest(request, mockClient);
    const responseJson = await response.json();

    assertEquals(response.status, 400);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "project_id is required.");
  });

  await t.step("Client not configured (simulated)", async () => {
    // Pass null as SupabaseClient to simulate it not being initialized
    const request = new Request("http://localhost/ai-scriptwriting", {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ project_id: "any_id", research_data: sampleResearchData }),
    });
    // Explicitly cast null to SupabaseClient for the test
    const response = await handleScriptRequest(request, null as unknown as SupabaseClient);
    const responseJson = await response.json();

    assertEquals(response.status, 500);
    assertExists(responseJson.error);
    assertEquals(responseJson.error, "Database client is not configured.");
  });

});

console.log("Supabase Edge Function tests created: supabase/functions/ai-scriptwriting/index.test.ts");
// To run: deno test --allow-env --allow-net supabase/functions/ai-scriptwriting/index.test.ts
// (Adjust CWD if needed)
// --allow-net might not be strictly necessary if mockLlmScriptCall is purely synchronous after the timeout promise.
// --allow-env is needed for the main index.ts Deno.env.get calls.
