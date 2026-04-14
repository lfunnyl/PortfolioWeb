export function getSentimentColor(relevanceScore: number) {
  if (relevanceScore > 50) return '#10b981'; // Green for high relevance/sentiment
  if (relevanceScore < 20) return '#ef4444'; // Red for low
  return '#64748b'; // Gray for neutral
}

export function generatePrintStyles() {
  return `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-report, #print-report * {
        visibility: visible;
      }
      #print-report {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 20px;
        background: white;
        color: #1a1a2e; /* Dark professional print color */
      }
      
      .print-btn-container {
        display: none !important;
      }
      
      .report-header {
        border-bottom: 3px solid #1a1a2e;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .report-title {
        font-size: 28px;
        font-weight: bold;
        color: #1a1a2e;
        margin: 0;
      }
      
      .report-meta {
        color: #666;
        font-size: 12px;
        margin-top: 5px;
      }
      
      .section-title {
        background: #1a1a2e;
        color: white;
        padding: 5px 10px;
        font-size: 16px;
        font-weight: bold;
        margin-top: 30px;
        margin-bottom: 15px;
      }
      
      .news-item {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #ddd;
      }
      
      .news-title {
        font-size: 14px;
        font-weight: bold;
        margin: 0 0 5px 0;
        color: #1a1a2e;
      }
      
      .news-meta {
        font-size: 10px;
        color: #666;
        margin-bottom: 5px;
      }
      
      .news-desc {
        font-size: 12px;
        color: #333;
        line-height: 1.4;
      }
    }
  `;
}
