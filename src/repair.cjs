const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let code = fs.readFileSync(appPath, 'utf8');

// Replace the entire broken section of the navigation bar and the old subtabs switcher with the corrected layout!
// Let's identify the boundaries.
// We want to replace from line 1315 down to the end of the managerTab === 'placement' switcher logic.
// Let's do a precise string replacement.

const oldSectionMarker = `              <button\r\n                onClick={() => setManagerTab('students')}`;
// Let's do a more robust regex replacement that handles CRLF or LF automatically!

const regex = /<button\s+onClick=\{\(\)\s+=>\s+setManagerTab\('students'\)\}[\s\S]+?\{managerTab\s+===\s+'placement'\s+&&\s+\([\s\S]+?\}\s+onUpdateCompletedHours=\{handleUpdateCompletedHours\}\s*\/>\s*\}\s*<\/div>\s*<\/div>\s*\}\)/;

// Let's view where managerTab === 'students' page starts:
// "{/* Core manager firebase pages */}"
const splitMarker = "{/* Core manager firebase pages */}";
const parts = code.split(splitMarker);

if (parts.length === 2) {
  // Let's rewrite the first part from "<button" (for 'students') to the end of that part.
  const firstPart = parts[0];
  const navStartIdx = firstPart.indexOf("<button\r\n                onClick={() => setManagerTab('students')}");
  const navStartIdxLF = firstPart.indexOf("<button\n                onClick={() => setManagerTab('students')}");
  
  const targetStartIdx = navStartIdx !== -1 ? navStartIdx : navStartIdxLF;
  
  if (targetStartIdx !== -1) {
    const cleanFirstPart = firstPart.substring(0, targetStartIdx) + `              <button
                onClick={() => setManagerTab('students')}
                className={\`flex-shrink-0 px-4 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 \${
                  managerTab === 'students'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }\`}
              >
                <GraduationCap size={15} />
                <span>شؤون الطلاب</span>
              </button>

              <button
                onClick={() => setManagerTab('teachers')}
                className={\`flex-shrink-0 px-4 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 \${
                  managerTab === 'teachers'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }\`}
              >
                <BookOpenCheck size={15} />
                <span>إدارة المعلمين ومستحقات الدفع</span>
              </button>

              <button
                onClick={() => setManagerTab('sessions')}
                className={\`flex-shrink-0 px-4 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 \${
                  managerTab === 'sessions'
                    ? 'bg-teal-650 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }\`}
              >
                <Activity size={15} />
                <span>رصد الحصص والدروس فردي</span>
                {pendingApprovalsCount > 0 && (
                  <span className="bg-amber-500 text-amber-950 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse min-w-[20px] text-center">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setManagerTab('reports')}
                className={\`flex-shrink-0 px-4 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 \${
                  managerTab === 'reports'
                    ? 'bg-teal-6 \t text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }\`}
              >
                <BarChart3 size={15} />
                <span>التقارير التحليلية والمالية والمخططات</span>
              </button>

              <button
                onClick={() => setManagerTab('settings')}
                className={\`flex-shrink-0 px-4 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 \${
                  managerTab === 'settings'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }\`}
              >
                <Settings size={15} />
                <span>إعدادات النظام والأسعار</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Tab contents router */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
          {managerTab === 'placement' && (
            <div className="space-y-6">
              <GroupCourseManagement
                courses={courses}
                students={students}
                teachers={teachersList}
                onAddCourse={handleAddCourse}
                onDeleteCourse={handleDeleteCourse}
                onUpdateCompletedHours={handleUpdateCompletedHours}
              />
            </div>
          )}
          
`;
    
    fs.writeFileSync(appPath, cleanFirstPart + splitMarker + parts[1], 'utf8');
    console.log('Successfully repaired App.tsx!');
  } else {
    console.log('Could not find navStartIdx in App.tsx');
  }
} else {
  console.log('Split marker not found in App.tsx');
}
