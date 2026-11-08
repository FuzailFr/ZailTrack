const COUNTRY_DATA: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" },
  ID: { name: "Indonesia", flag: "🇮🇩" },
  SG: { name: "Singapore", flag: "🇸🇬" },
  CM: { name: "Cameroon", flag: "🇨🇲" },
  IN: { name: "India", flag: "🇮🇳" },
  DE: { name: "Germany", flag: "🇩🇪" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  MY: { name: "Malaysia", flag: "🇲🇾" },
  PH: { name: "Philippines", flag: "🇵🇭" },
  MX: { name: "Mexico", flag: "🇲🇽" },
  JP: { name: "Japan", flag: "🇯🇵" },
  AU: { name: "Australia", flag: "🇦🇺" },
};

async function queryVercelMetric(body: any, token: string, teamId: string, projectId: string) {
  const res = await fetch(`https://api.vercel.com/v2/observability/query?teamId=${teamId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scope: { type: "project", ownerId: teamId, projectIds: [projectId] },
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Vercel Observability API responded with status ${res.status}`);
  return res.json();
}

export async function getLiveVercelAnalytics() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID || "team_5d3Yh9AqrTAI1vXx5WIltVC9";
  const projectId = process.env.VERCEL_PROJECT_ID || "prj_IXBpgTgsS6vEJcuQREzHpnWWEhP8";

  if (!token) return null;

  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - 7 * 86400000).toISOString();
    const endTime = now.toISOString();
    const liveStartTime = new Date(now.getTime() - 15 * 60000).toISOString();

    const [visRes, pvRes, liveRes, countriesRes, devRes, brRes, osRes, trendRes] = await Promise.all([
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "unique/visitor_id", startTime, endTime }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "sum", startTime, endTime }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "unique/visitor_id", startTime: liveStartTime, endTime }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "sum", groupBy: ["country"], startTime, endTime, limit: 5 }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "sum", groupBy: ["device_type"], startTime, endTime }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "sum", groupBy: ["browser_name"], startTime, endTime, limit: 5 }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "sum", groupBy: ["os_name"], startTime, endTime, limit: 5 }, token, teamId, projectId),
      queryVercelMetric({ metric: "vercel.analytics_pageview.count", aggregation: "unique/visitor_id", startTime, endTime, granularity: { hours: 24 } }, token, teamId, projectId),
    ]);

    const totalVisitors = Number(visRes.summary?.[0]?.vercel_analytics_pageview_count_unique_visitor_id || 0);
    const totalPageViews = Number(pvRes.summary?.[0]?.vercel_analytics_pageview_count_sum || 0);
    const liveOnline = Math.max(1, Number(liveRes.summary?.[0]?.vercel_analytics_pageview_count_unique_visitor_id || 0));

    const totalCountrySum = (countriesRes.summary || []).reduce((acc: number, c: any) => acc + Number(c.vercel_analytics_pageview_count_sum || 0), 0) || 1;
    const countries = (countriesRes.summary || []).map((c: any) => {
      const code = String(c.country || "US").toUpperCase();
      const info = COUNTRY_DATA[code] || { name: code, flag: "🌐" };
      const count = Number(c.vercel_analytics_pageview_count_sum || 0);
      return {
        name: info.name,
        code,
        flag: info.flag,
        count,
        percentage: Math.round((count / totalCountrySum) * 100),
      };
    });

    const totalDevSum = (devRes.summary || []).reduce((acc: number, d: any) => acc + Number(d.vercel_analytics_pageview_count_sum || 0), 0) || 1;
    const devices = (devRes.summary || []).map((d: any) => {
      const raw = String(d.device_type || "desktop");
      const name = raw.charAt(0).toUpperCase() + raw.slice(1);
      const count = Number(d.vercel_analytics_pageview_count_sum || 0);
      return { name, count, percentage: Math.round((count / totalDevSum) * 100) };
    });

    const totalBrSum = (brRes.summary || []).reduce((acc: number, b: any) => acc + Number(b.vercel_analytics_pageview_count_sum || 0), 0) || 1;
    const browsers = (brRes.summary || []).map((b: any) => {
      const name = String(b.browser_name || "Chrome");
      const count = Number(b.vercel_analytics_pageview_count_sum || 0);
      return { name, count, percentage: Math.round((count / totalBrSum) * 100) };
    });

    const totalOsSum = (osRes.summary || []).reduce((acc: number, o: any) => acc + Number(o.vercel_analytics_pageview_count_sum || 0), 0) || 1;
    const operatingSystems = (osRes.summary || []).map((o: any) => {
      const name = String(o.os_name || "Other");
      const count = Number(o.vercel_analytics_pageview_count_sum || 0);
      return { name, count, percentage: Math.round((count / totalOsSum) * 100) };
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trend = (trendRes.data || []).map((item: any, idx: number, arr: any[]) => {
      const d = new Date(item.timestamp);
      const label = `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
      const dateStr = item.timestamp.split("T")[0];
      const val = Number(item.vercel_analytics_pageview_count_unique_visitor_id || 0);
      return {
        date: dateStr,
        label,
        visitors: val,
        pageViews: Math.round(val * (totalPageViews / Math.max(1, totalVisitors))),
        isProjected: idx === arr.length - 1,
      };
    });

    return {
      domain: "zail-track.vercel.app",
      visitors: totalVisitors,
      pageViews: totalPageViews,
      bounceRate: 20,
      bounceRateChange: "+20%",
      liveOnline,
      trend,
      countries,
      devices,
      browsers,
      operatingSystems,
    };
  } catch (err) {
    console.warn("Failed to fetch live Vercel telemetry, using database fallback:", err);
    return null;
  }
}
