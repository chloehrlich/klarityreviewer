import Papa from "papaparse";

// Parse an uploaded CSV export and group rows by the person who was pinned.
// Expected columns mirror the demo data plus a "Pinned By" column that names
// the person each signal belongs to.
export function parseCsvToPeople(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const people = {};
          for (const row of results.data) {
            const person = (row["Pinned By"] || "").trim();
            if (!person) continue;
            if (!people[person]) people[person] = [];
            people[person].push({
              Title: row.Title || "",
              Type: row.Type || "",
              Description: row.Description || "",
              "Session Date": row["Session Date"] || "",
              Time: row.Time || "",
              Duration: row.Duration || "",
              Tools: row.Tools || "",
              Category: row.Category || "",
            });
          }
          if (Object.keys(people).length === 0) {
            reject(
              new Error(
                'No people found. CSV needs a "Pinned By" column naming each person.'
              )
            );
            return;
          }
          resolve(people);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}
