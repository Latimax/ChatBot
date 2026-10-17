import { describe, it, expect, beforeEach } from 'vitest';
import { chunkText, RagService } from '../lib/ragService.js';

describe('RagService', () => {
  beforeEach(() => {
    RagService.clearIndex();
  });

  it('splits long text into coherent chunks with token estimates', () => {
    const sampleText = `
# Section 1: Overview
We provide scalable serverless cloud hosting.

# Section 2: Pricing
Our pricing plans are Starter ($15/mo) and Growth ($49/mo).

# Section 3: Refund Policy
We offer a 30-day money-back guarantee for first-time subscribers.
    `.trim();

    const chunks = chunkText(sampleText, { maxChunkChars: 120, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].tokenEstimate).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('Section 1');
  });

  it('indexes document and retrieves the most relevant chunks for a question', () => {
    const companyHandbook = `
## About Us
Acme Solutions is a premier software company based in Chicago.

## Refund and Cancellation Policy
Customers are eligible for a 100% full refund within 30 days of purchase with no questions asked.
Cancellation can be done anytime from the billing dashboard.

## Technical Support Hours
Our customer service desk is open 24/7/365 through live chat and email.
Phone support is available Monday to Friday 9am to 5pm for Enterprise contracts.
    `.trim();

    const indexRes = RagService.indexDocument({
      title: 'Acme Handbook',
      content: companyHandbook,
      chunkSize: 200,
      chunkOverlap: 40
    });

    expect(indexRes.success).toBe(true);
    expect(indexRes.chunksCount).toBeGreaterThan(1);

    // Query specifically about refunds
    const refundResults = RagService.retrieveRelevantChunks({
      query: 'What is your refund policy?',
      topK: 2
    });

    expect(refundResults.length).toBeGreaterThan(0);
    expect(refundResults[0].content.toLowerCase()).toContain('refund');

    // Query specifically about phone support hours
    const supportResults = RagService.retrieveRelevantChunks({
      query: 'What are your support hours for phone calls?',
      topK: 2
    });

    expect(supportResults.length).toBeGreaterThan(0);
    expect(supportResults[0].content.toLowerCase()).toContain('support');
  });

  it('reports correct status and clears index when requested', () => {
    RagService.indexDocument({
      title: 'Test Doc',
      content: 'Some company information here.'
    });

    let status = RagService.getStatus();
    expect(status.isIndexed).toBe(true);
    expect(status.totalChunks).toBe(1);

    RagService.clearIndex();
    status = RagService.getStatus();
    expect(status.isIndexed).toBe(false);
    expect(status.totalChunks).toBe(0);
  });
});
