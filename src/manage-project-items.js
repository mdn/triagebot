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
    getItemValue: (item) => extractISODate(item.content.createdAt),
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
      }
    }
  }
}

await main();
