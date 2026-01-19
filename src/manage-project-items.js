import {
  extractISODate,
  getProjectId,
  getProjectFields,
  iterateProjectItems,
  setProjectItemFieldValue,
} from "./lib.js";

/**
 * @param {object} field
 * @param {string} name
 * @param {string} dataType
 * @returns {boolean}
 */
function isField(field, name, dataType) {
  return (
    field?.name.toLowerCase().includes(name.toLowerCase()) &&
    field?.dataType.toLowerCase() === dataType.toLowerCase()
  );
}

const SUPPORTED_FIELDS = [
  {
    is: (field) => isField(field, "created at", "date"),
    getItemValue: (item) => extractISODate(item.content?.createdAt),
    getFieldValueValue: (field) => field?.date,
    createInput: (date) => ({ date }),
  },
  {
    is: (field) => isField(field, "created by", "text"),
    getItemValue: (item) => item.content?.author?.login,
    getFieldValueValue: (field) => field?.text,
    createInput: (text) => ({ text }),
  },
  {
    is: (field) => isField(field, "updated at", "date"),
    getItemValue: (item) => extractISODate(item.content?.updatedAt),
    getFieldValueValue: (field) => field?.date,
    createInput: (date) => ({ date }),
  },
  {
    is: (field) => isField(field, "closed at", "date"),
    getItemValue: (item) => extractISODate(item.content?.closedAt),
    getFieldValueValue: (field) => field?.date,
    createInput: (date) => ({ date }),
  },
  {
    is: (field) => isField(field, "merged at", "date"),
    getItemValue: (item) => extractISODate(item.content?.mergedAt),
    getFieldValueValue: (field) => field?.date,
    createInput: (date) => ({ date }),
  },
  {
    is: (field) => isField(field, "merged by", "text"),
    getItemValue: (item) => item.content?.mergedBy?.login,
    getFieldValueValue: (field) => field?.text,
    createInput: (text) => ({ text }),
  },
  {
    is: (field) => isField(field, "last commenter", "text"),
    getItemValue: (item) => item.content?.comments?.nodes.at(-1)?.author?.login,
    getFieldValueValue: (field) => field?.text,
    createInput: (text) => ({ text }),
  },
];

async function getUsedFields(projectOwner, projectNumber) {
  const projectFields = await getProjectFields(projectOwner, projectNumber);

  const usedFields = [];
  for (const supportedField of SUPPORTED_FIELDS) {
    const field = projectFields.find((field) => supportedField.is(field));

    if (field) {
      usedFields.push({
        ...supportedField,
        field,
      });
    }
  }

  return usedFields;
}

async function main() {
  const projectOwner = process.env["ISSUE_PROJECT_OWNER"];
  const projectNumber = Number(process.env["ISSUE_PROJECT_NUMBER"]);

  const projectId = await getProjectId(projectOwner, projectNumber);
  const fields = await getUsedFields(projectOwner, projectNumber);

  if (!fields.length) {
    console.log("No field to manage.");
    return;
  }

  const updatedItems = new Set();
  const fieldUpdateCounts = new Map();

  for (const f of fields) {
    fieldUpdateCounts.set(f.field.name, 0);
  }

  for await (const item of iterateProjectItems(projectOwner, projectNumber)) {
    for (const f of fields) {
      const fieldValue = item.fieldValues.nodes.find((fieldValue) =>
        f.is(fieldValue.field),
      );
      const value = f.getFieldValueValue(fieldValue) ?? null;
      const expectedValue = f.getItemValue(item) ?? null;
      if (value !== expectedValue) {
        setProjectItemFieldValue(
          projectId,
          item.id,
          f.field.id,
          f.createInput(expectedValue),
        );
        updatedItems.add(item.id);
        fieldUpdateCounts.set(
          f.field.name,
          fieldUpdateCounts.get(f.field.name) + 1,
        );
      }
    }
  }

  console.log(`\nUpdated ${updatedItems.size} project item(s).`);
  if (updatedItems.size > 0) {
    console.log("Field updates:");
    for (const [fieldName, count] of fieldUpdateCounts) {
      if (count > 0) {
        console.log(`  - ${fieldName}: ${count}`);
      }
    }
  }
}

await main();
