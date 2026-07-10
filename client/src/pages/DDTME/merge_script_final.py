import os, json, re

ddtme_path = r'd:\PMS\Project-management\client\src\pages\DDTME\DDTMETable.jsx'
demo_path = r'd:\PMS\Project-management\client\src\pages\DDTME\CapacityPlannerDemo.jsx'

with open(ddtme_path, 'r', encoding='utf-8') as f:
    ddtme = f.read()

with open(demo_path, 'r', encoding='utf-8') as f:
    demo = f.read()

# 1. Update imports
ddtme = re.sub(
    r"import {([^}]+)} from 'lucide-react';",
    r"import {\1, LayoutGrid, Users, Check, Clock, UserCheck} from 'lucide-react';",
    ddtme
)

# 2. Extract Top Half (up to return)
return_idx = ddtme.find('  return (\n    <div className="p-3')
if return_idx == -1:
    print("Could not find the correct return statement!")
    exit(1)

top_half = ddtme[:return_idx]

# 3. Add viewMode state
top_half = top_half.replace(
    'const [loading, setLoading] = useState(true);',
    'const [loading, setLoading] = useState(true);\n  const [viewMode, setViewMode] = useState(\'task\');'
)

# 4. We DO NOT need to inject visibleObjectives, visibleBigTasks, visibleAdditionalTasks,
# because they are ALREADY declared in the top half around line 1250!
# We just need to add `allTasks`, `totalHours` and `activeResources` which were not in the original.
metrics_logic = """
  const allTasks = [
    ...visibleBigTasks.map(t => ({ ...t, type: 'big', title: t.ddtme_title || t.title })),
    ...visibleAdditionalTasks.map(t => ({ ...t, type: 'add', title: t.title }))
  ];

  let totalHours = 0;
  Object.values(manDayData).forEach(val => {
    totalHours += (parseFloat(val.on) || 0) + (parseFloat(val.off) || 0);
  });
  
  const activeResources = new Set();
  Object.keys(manDayData).forEach(key => {
    const parts = key.split('_');
    if (parts.length >= 3) {
      const empId = parts.slice(2).join('_'); // Handle u-XX
      const data = manDayData[key];
      if ((parseFloat(data.on) || 0) > 0 || (parseFloat(data.off) || 0) > 0) {
        activeResources.add(empId);
      }
    }
  });

"""
top_half += metrics_logic

# 5. Extract UI from Demo
demo_return_idx = demo.find('  return (')
demo_ui = demo[demo_return_idx:]

# 6. Adapt Demo UI to real state
demo_ui = demo_ui.replace('DUMMY_OBJECTIVES', 'visibleObjectives')
demo_ui = demo_ui.replace('DUMMY_TASKS', 'allTasks')
demo_ui = demo_ui.replace('DUMMY_EMPLOYEES', 'tablePeople')
demo_ui = demo_ui.replace('emp.color', '"bg-slate-100 text-slate-700"') # Default color
demo_ui = demo_ui.replace('emp.initials', '(emp.label ? emp.label.substring(0, 2).toUpperCase() : "NA")')
demo_ui = demo_ui.replace('emp.name', 'emp.label')
demo_ui = demo_ui.replace('obj.text', 'obj.objective')

# Fix getHours usage inside the map
demo_ui = demo_ui.replace('parseHour(', 'parseHourValue(')
demo_ui = demo_ui.replace('onChange={(e) => handleHourChange', 'disabled={!canEditHoursForPerson(emp.id)} onChange={(e) => handleHourChange')
demo_ui = demo_ui.replace('bg-white text-slate-800', '${!canEditHoursForPerson(emp.id) ? "bg-slate-50 cursor-not-allowed" : "bg-white text-slate-800"}')

# Fix Submit button (Only replace the opening tag and className!)
original_submit_btn = '<button className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-md">'
new_submit_btn = '<button onClick={handleSendForApproval} disabled={isSubmitting || !canSubmit} className={`flex items-center gap-2 px-5 py-2 bg-slate-900 ${(!canSubmit || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""} text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-md`}>'
demo_ui = demo_ui.replace(original_submit_btn, new_submit_btn)

# Fix Download button
original_download_btn = '<button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">'
new_download_btn = '<button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">'
demo_ui = demo_ui.replace(original_download_btn, new_download_btn)

# Project Lead Name
demo_ui = demo_ui.replace('Sarah Jenkins', '{sgmName || "Unassigned"}')

# Status Pill Logic
status_pill = """
            <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${
              planStatus === 'APPROVED' ? 'bg-green-50 border-green-200' :
              planStatus === 'SUBMITTED' ? 'bg-yellow-50 border-yellow-200' :
              planStatus === 'REJECTED' ? 'bg-red-50 border-red-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              {planStatus === 'APPROVED' && <CheckCircle size={14} className="text-green-600" />}
              <span className={`text-xs font-bold tracking-wide uppercase ${
                planStatus === 'APPROVED' ? 'text-green-700' :
                planStatus === 'SUBMITTED' ? 'text-yellow-700' :
                planStatus === 'REJECTED' ? 'text-red-700' :
                'text-slate-700'
              }`}>{planStatus}</span>
            </div>
"""
# Replace the static approved pill
pill_regex = r'<div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">.*?</div>'
demo_ui = re.sub(pill_regex, status_pill.strip(), demo_ui, flags=re.DOTALL)

# Inject the Modals inside the main container div
modal_code_idx = ddtme.find('{/* ---- Upload Excel Column Mapping Modal ---- */}')
if modal_code_idx != -1:
    modal_end_idx = ddtme.find('      )}', modal_code_idx)
    modal_code = ddtme[modal_code_idx:modal_end_idx + 8] # Include the `)}`
    
    demo_ui = demo_ui.replace(
        '<div className="max-w-[1400px] mx-auto space-y-8">',
        '<div className="max-w-[1400px] mx-auto space-y-8">\n' + modal_code
    )

demo_ui = demo_ui.replace('  );\n}\n', '  );\n};\nexport default DDTMETable;\n')

# 7. Write Back
with open(ddtme_path, 'w', encoding='utf-8') as f:
    f.write(top_half + demo_ui)

print('Success')
