// Helper to generate the next SPI customer code in the format NAEF-YYYY-XXXX
// Usage: const { code } = await generateNextNaefCode(pool [, year]);
// Note: This uses a best-effort approach and should be called right before insert.
export async function generateNextNaefCode(poolOrRequest, year) {
    console.log("Generating next NAEF code...");
  const forYear = Number.isInteger(year) ? year : new Date().getFullYear();
  // Obtain a request object regardless of whether a pool or a request was passed in
  const request = typeof poolOrRequest.request === "function"
    ? poolOrRequest.request()
    : poolOrRequest; // assume it's already a Request-like (has input/query)

  const prefix = `NAEF-${forYear}-`;
  request.input("pref", `${prefix}%`);
  // Extract the trailing number and sort desc to find the latest
  const sql = `
    SELECT TOP (1) Code,
           TRY_CAST(RIGHT(Code, 4) AS INT) AS LastNum
    FROM spidb.customer
    WHERE Code LIKE @pref
    ORDER BY TRY_CAST(RIGHT(Code, 4) AS INT) DESC;
  `;
  const r = await request.query(sql);
  const last = r?.recordset?.[0]?.LastNum || 0;
  const next = last + 1;
  const code = `${prefix}${String(next).padStart(4, "0")}`;
  console.log(`Generated next NAEF code: ${code}`);
  return { year: forYear, lastNumber: last, nextNumber: next, code };
}
