require('dotenv').config({ path: '../.env' });

const TOKEN = process.env.HUBSPOT_TOKEN;

const payload = {
  name: "WF - Prioridad Urgente VIP (Incumplimientos)",
  objectTypeId: "0-5",
  flowType: "WORKFLOW",
  type: "PLATFORM_FLOW",
  isEnabled: false,
  startActionId: "1",
  nextAvailableActionId: "3",
  actions: [
    {
      actionId: "1",
      listBranches: [
        {
          filterBranch: {
            filterBranches: [{
              filterBranches: [],
              filters: [{ listId: "618", operator: "IN_LIST", filterType: "IN_LIST" }],
              filterBranchType: "AND",
              filterBranchOperator: "AND",
              associatedObjectType: "0-2"
            }],
            filters: [],
            filterBranchType: "OR",
            filterBranchOperator: "OR"
          },
          branchName: "Company VIP",
          connection: { edgeType: "STANDARD", nextActionId: "2" }
        },
        {
          filterBranch: {
            filterBranches: [{
              filterBranches: [],
              filters: [{ listId: "622", operator: "IN_LIST", filterType: "IN_LIST" }],
              filterBranchType: "AND",
              filterBranchOperator: "AND",
              associatedObjectType: "0-1"
            }],
            filters: [],
            filterBranchType: "OR",
            filterBranchOperator: "OR"
          },
          branchName: "Contacto VIP",
          connection: { edgeType: "STANDARD", nextActionId: "2" }
        }
      ],
      type: "LIST_BRANCH"
    },
    {
      actionId: "2",
      actionTypeVersion: 0,
      actionTypeId: "0-5",
      fields: {
        property_name: "hs_ticket_priority",
        value: { staticValue: "URGENT", type: "STATIC_VALUE" }
      },
      type: "SINGLE_CONNECTION"
    }
  ],
  enrollmentCriteria: {
    shouldReEnroll: true,
    listFilterBranch: {
      filterBranches: [{
        filterBranches: [],
        filters: [{
          property: "hs_pipeline",
          operation: {
            operator: "IS_ANY_OF",
            includeObjectsWithNoValueSet: false,
            values: ["3353793749"],
            operationType: "ENUMERATION"
          },
          filterType: "PROPERTY"
        }],
        filterBranchType: "AND",
        filterBranchOperator: "AND"
      }],
      filters: [],
      filterBranchType: "OR",
      filterBranchOperator: "OR"
    },
    type: "LIST_BASED"
  }
};

async function crearWF() {
  const res = await fetch('https://api.hubapi.com/automation/v4/flows', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.id) {
    console.log('WF creado correctamente. ID:', data.id);
    console.log('Nombre:', data.name);
    console.log('Estado:', data.isEnabled ? 'Activo' : 'Desactivado');
  } else {
    console.error('Error:', JSON.stringify(data, null, 2));
  }
}

crearWF().catch(console.error);
