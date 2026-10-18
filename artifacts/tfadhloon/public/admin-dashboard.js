// Firebase Configuration
      const firebaseConfig = {
        apiKey: "AIzaSyAXUdqcAfldO1YuxlKDWCh7EYo2nO4AMog",
        authDomain: "spyfall-fb59a.firebaseapp.com",
        projectId: "spyfall-fb59a",
        storageBucket: "spyfall-fb59a.firebasestorage.app",
        messagingSenderId: "125069847545",
        appId: "1:125069847545:web:faa43c6e58db9df7242b28",
        measurementId: "G-MFV3SETE0D",
        databaseURL: "https://spyfall-fb59a-default-rtdb.firebaseio.com",
      };

      firebase.initializeApp(firebaseConfig);
      const database = firebase.database();
      const storage = firebase.storage();

      // Check authentication
      function checkAuth() {
        if (sessionStorage.getItem("adminAuthenticated") !== "true") {
          window.location.href = "admin.html";
          return false;
        }

        const loginTime = parseInt(
          sessionStorage.getItem("adminLoginTime") || "0",
        );
        const currentTime = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000;

        if (currentTime - loginTime > sessionDuration) {
          logout();
          return false;
        }

        return true;
      }

      // Logout function
      function logout() {
        sessionStorage.removeItem("adminAuthenticated");
        sessionStorage.removeItem("adminLoginTime");
        sessionStorage.removeItem("tfadhloonAdminPassword");
        window.location.href = "admin.html";
      }

      // Navigation
      function showSection(sectionName) {
        document.querySelectorAll(".content-section").forEach((section) => {
          section.classList.remove("active");
        });

        document.querySelectorAll(".menu-link").forEach((link) => {
          link.classList.remove("active");
        });

        document.getElementById(sectionName).classList.add("active");
        document
          .querySelector(`[data-section="${sectionName}"]`)
          .classList.add("active");

        const titles = {
          dashboard: "Dashboard",
          questions: "Manage Questions",
          ads: "Manage Advertisements",
          sponsored_ads: "Manage Sponsored Ads",
          spy_words: "Manage Spy Words",
          games: "Active Games",
          settings: "Settings",
        };
        document.getElementById("pageTitle").textContent =
          titles[sectionName] || "Dashboard";

        if (sectionName === "questions") {
          loadQuestions();
          clearSelections();
          loadCategoriesForBulkDelete();
        } else if (sectionName === "ads") {
          loadAds();
        } else if (sectionName === "sponsored_ads") {
          loadSponsoredAds();
        } else if (sectionName === "games") {
          loadGames();
        } else if (sectionName === "spy_words") {
          loadSpyWords();
        } else if (sectionName === "dashboard") {
          loadDashboardStats();
        }
      }

      // Menu click handlers
      document.querySelectorAll(".menu-link").forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          const section = this.getAttribute("data-section");
          showSection(section);
        });
      });

      // Initialize dashboard
      if (checkAuth()) {
        loadDashboardStats();
      }

      // Dashboard stats loading
      function loadDashboardStats() {
        Promise.all([
          database.ref("admin/questions/english/simple").once("value"),
          database.ref("admin/questions/english/sponsored").once("value"),
          database.ref("admin/questions/arabic/simple").once("value"),
          database.ref("admin/questions/arabic/sponsored").once("value"),
        ]).then(
          ([
            simpleEngSnap,
            sponsoredEngSnap,
            simpleAraSnap,
            sponsoredAraSnap,
          ]) => {
            let totalQuestions = 0;

            function countQuestionsInSnapshot(snapshot) {
              let count = 0;
              const data = snapshot.val() || {};
              Object.values(data).forEach((category) => {
                if (category && typeof category === "object") {
                  count += Object.keys(category).length;
                }
              });
              return count;
            }

            totalQuestions += countQuestionsInSnapshot(simpleEngSnap);
            totalQuestions += countQuestionsInSnapshot(sponsoredEngSnap);
            totalQuestions += countQuestionsInSnapshot(simpleAraSnap);
            totalQuestions += countQuestionsInSnapshot(sponsoredAraSnap);

            document.getElementById("totalQuestions").textContent =
              totalQuestions;
          },
        );

        database.ref("suggestedCategories").on("value", (snapshot) => {
          const suggestions = snapshot.val() || {};
          const pendingSuggestions = Object.values(suggestions).filter(
            (suggestion) => suggestion.status === "pending",
          );
          document.getElementById("pendingSuggestions").textContent =
            pendingSuggestions.length;
        });

        database.ref("admin/ads").on("value", (snapshot) => {
          const ads = snapshot.val() || {};
          const activeAds = Object.values(ads).filter(
            (ad) => ad.status === "active",
          );
          document.getElementById("totalAds").textContent = activeAds.length;
        });

        database.ref("admin/sponsored_ads").on("value", (snapshot) => {
          const sponsoredAds = snapshot.val() || {};
          const activeSponsoredAds = Object.values(sponsoredAds).filter(
            (ad) => ad.status === "active",
          );
          document.getElementById("totalSponsoredAds").textContent =
            activeSponsoredAds.length;
        });

        database.ref("games").on("value", (snapshot) => {
          const games = snapshot.val() || {};
          const activeGames = Object.values(games).filter(
            (game) => !game.gameEnded,
          );
          document.getElementById("activeGames").textContent =
            activeGames.length;

          let totalPlayers = 0;
          Object.values(games).forEach((game) => {
            if (game.players) {
              totalPlayers += Object.keys(game.players).length;
            }
          });
          document.getElementById("totalPlayers").textContent = totalPlayers;
        });
      }

      // Questions Management Functions
      function showLanguageSelectionModal() {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "languageSelectionModal";
        modal.innerHTML = `
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Select Language</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p>Please select the language for the new question:</p>
                <div class="d-flex justify-content-around">
                  <button class="btn btn-primary-custom" onclick="showTypeSelectionModal('english')">English</button>
                  <button class="btn btn-primary-custom" onclick="showTypeSelectionModal('arabic')">Arabic</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      function showTypeSelectionModal(language) {
        bootstrap.Modal.getInstance(document.querySelector(".modal")).hide();

        database
          .ref(`admin/questions/categories/${language}`)
          .once("value")
          .then((snapshot) => {
            const categories = snapshot.val() || {};

            const modal = document.createElement("div");
            modal.className = "modal fade";
            modal.id = "typeSelectionModal";
            modal.innerHTML = `
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Select Question Type for ${language.charAt(0).toUpperCase() + language.slice(1)}</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label">Select Category</label>
                    <select class="form-control" id="categorySelect">
                      <option value="">-- Select Category --</option>
                      ${Object.keys(categories)
                        .map(
                          (cat) =>
                            `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`,
                        )
                        .join("")}
                      <option value="new_category">+ Add New Category</option>
                    </select>
                  </div>
                  <div id="newCategoryDiv" style="display:none;" class="mb-3">
                    <label class="form-label">New Category Name</label>
                    <input type="text" class="form-control" id="newCategoryName" placeholder="Enter category name">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Select Question Type</label>
                    <div class="d-flex justify-content-around mt-2">
                      <button class="btn btn-primary-custom" onclick="showAddQuestionModal('${language}', 'simple')">Simple</button>
                      <button class="btn btn-primary-custom" onclick="showAddQuestionModal('${language}', 'sponsored')">Sponsored</button>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
              </div>
            </div>
          `;

            document.body.appendChild(modal);
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

            document
              .getElementById("categorySelect")
              .addEventListener("change", function () {
                const newCategoryDiv =
                  document.getElementById("newCategoryDiv");
                newCategoryDiv.style.display =
                  this.value === "new_category" ? "block" : "none";
              });

            window.showAddQuestionModal = function (language, type) {
              const categorySelect = document.getElementById("categorySelect");
              const newCategoryName =
                document.getElementById("newCategoryName");
              let category = categorySelect.value;

              if (category === "new_category") {
                category = newCategoryName.value.trim();
                if (!category) {
                  alert("Please enter a category name");
                  return;
                }
                database
                  .ref(`admin/questions/categories/${language}/${category}`)
                  .set(true);
              }

              if (!category) {
                alert("Please select or create a category");
                return;
              }

              bootstrapModal.hide();
              showAddQuestionModalWithCategory(language, type, category);
            };

            modal.addEventListener("hidden.bs.modal", () => {
              document.body.removeChild(modal);
            });
          });
      }

      function showAddQuestionModalWithCategory(language, type, category) {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "addQuestionModal";
        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Add New ${language.charAt(0).toUpperCase() + language.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)} Question</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="addQuestionForm">
                  <div class="mb-3">
                    <label class="form-label">Category</label>
                    <input type="text" class="form-control" id="category" value="${category}" readonly>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Option 1</label>
                    <input type="text" class="form-control" id="option1" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Option 2</label>
                    <input type="text" class="form-control" id="option2" required>
                  </div>
                </form>
                <div id="excelStatus" class="mt-2 small"></div>
              </div>
              <div class="modal-footer d-flex justify-content-between">
                <div>
                  <input type="file" id="excelFileInput" style="display:none" accept=".xlsx, .xls" onchange="handleExcelUpload(event, '${language}', '${type}', '${category}')">
                  <button type="button" class="btn btn-outline-success" onclick="document.getElementById('excelFileInput').click()">
                    <i class="fas fa-file-excel"></i> Add File (Excel)
                  </button>
                </div>
                <div>
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-primary-custom" onclick="addQuestion('${language}', '${type}', '${category}')">Add Question</button>
                </div>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      async function handleExcelUpload(event, language, type, category) {
        const file = event.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById("excelStatus");
        statusDiv.innerHTML = '<span class="text-primary">Processing...</span>';

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let count = 0;
            const path = `admin/questions/${language}/${type}/${category}`;

            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i];
              const opt1 = row[0] ? row[0].toString().trim() : "";
              const opt2 = row[1] ? row[1].toString().trim() : "";

              if (opt1 && opt2) {
                const qData = {
                  options: [opt1, opt2],
                  language,
                  type,
                  category,
                  createdAt: Date.now(),
                  id: Date.now().toString() + "_" + i,
                };
                await database.ref(path).push(qData);
                count++;
              }
            }

            if (count > 0) {
              alert(`${count} questions added successfully from Excel!`);
              bootstrap.Modal.getInstance(
                document.getElementById("addQuestionModal"),
              ).hide();
              loadQuestions();
              loadDashboardStats();
            } else {
              alert("No valid data in file. Column A and B must have text.");
              statusDiv.innerHTML = "";
            }
          } catch (err) {
            alert("Error reading file: " + err.message);
            statusDiv.innerHTML = "";
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function addQuestion(language, type, category) {
        const option1 = document.getElementById("option1").value;
        const option2 = document.getElementById("option2").value;

        if (!option1 || !option2 || !category) {
          alert("Please fill in all fields");
          return;
        }

        const questionData = {
          options: [option1, option2],
          language: language,
          type: type,
          category: category,
          createdAt: Date.now(),
          id: Date.now().toString(),
        };

        const path = `admin/questions/${language}/${type}/${category}`;
        database
          .ref(path)
          .push(questionData)
          .then(() => {
            alert("Question added successfully!");
            bootstrap.Modal.getInstance(
              document.querySelector(".modal"),
            ).hide();
            loadQuestions();
            loadDashboardStats();
          })
          .catch((error) => {
            alert("Error adding question: " + error.message);
          });
      }

      // Variables to track selected questions
      let selectedQuestions = {
        english: {},
        arabic: {},
      };

      function loadQuestions() {
        const englishTbody = document.getElementById(
          "englishQuestionsTableBody",
        );
        const arabicTbody = document.getElementById("arabicQuestionsTableBody");
        englishTbody.innerHTML = "";
        arabicTbody.innerHTML = "";

        selectedQuestions.english = {};
        selectedQuestions.arabic = {};
        updateBulkActionsBar();

        Promise.all([
          database.ref("admin/questions/english").once("value"),
          database.ref("admin/questions/arabic").once("value"),
        ])
          .then(([engSnap, araSnap]) => {
            const addQuestions = (questions, language, tbody) => {
              if (!questions) return;

              Object.entries(questions).forEach(([type, typeData]) => {
                if (!typeData) return;
                Object.entries(typeData).forEach(([category, categoryData]) => {
                  if (!categoryData) return;
                  Object.entries(categoryData).forEach(([key, question]) => {
                    const row = document.createElement("tr");
                    const checkboxId = `${language}_${type}_${category}_${key}`;
                    const isChecked =
                      selectedQuestions[language][checkboxId] || false;

                    row.innerHTML = `
                    <td>
                      <input type="checkbox" class="question-checkbox" id="${checkboxId}" 
                             onchange="toggleQuestionSelection('${language}', '${checkboxId}')"
                             ${isChecked ? "checked" : ""}>
                    </td>
                    <td>${question.id || key}</td>
                    <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
                    <td>${category}</td>
                    <td>${question.options[0]}</td>
                    <td>${question.options[1]}</td>
                    <td>
                      <button class="action-btn btn-edit" onclick="editQuestion('${key}', '${language}', '${type}', '${category}', '${question.options[0]}', '${question.options[1]}')">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="action-btn btn-delete" onclick="deleteQuestion('${key}', '${language}', '${type}', '${category}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  `;
                    tbody.appendChild(row);
                  });
                });
              });
            };

            addQuestions(engSnap.val() || {}, "english", englishTbody);
            addQuestions(araSnap.val() || {}, "arabic", arabicTbody);
            loadCategoriesForBulkDelete();
          })
          .catch((error) => {
            console.error("Error loading questions:", error);
          });
      }

      function toggleQuestionSelection(language, checkboxId) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
          selectedQuestions[language][checkboxId] = checkbox.checked;
        }
        updateBulkActionsBar();
        updateSelectAllCheckboxes();
      }

      function toggleSelectAll(language) {
        const selectAllCheckbox = document.getElementById(
          `selectAll${language.charAt(0).toUpperCase() + language.slice(1)}`,
        );
        const checkboxes = document.querySelectorAll(
          `#${language}QuestionsTableBody .question-checkbox`,
        );

        checkboxes.forEach((checkbox) => {
          checkbox.checked = selectAllCheckbox.checked;
          const checkboxId = checkbox.id;
          selectedQuestions[language][checkboxId] = selectAllCheckbox.checked;
        });

        updateBulkActionsBar();
      }

      function updateSelectAllCheckboxes() {
        ["english", "arabic"].forEach((language) => {
          const checkboxes = document.querySelectorAll(
            `#${language}QuestionsTableBody .question-checkbox`,
          );
          const selectAllCheckbox = document.getElementById(
            `selectAll${language.charAt(0).toUpperCase() + language.slice(1)}`,
          );

          if (checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
            const anyChecked = Array.from(checkboxes).some((cb) => cb.checked);

            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = anyChecked && !allChecked;
          }
        });
      }

      function updateBulkActionsBar() {
        const bulkActionsBar = document.getElementById("bulkActionsBar");
        const selectedCount = getSelectedCount();

        if (selectedCount > 0) {
          document.getElementById("selectedCount").textContent = selectedCount;
          bulkActionsBar.style.display = "flex";
        } else {
          bulkActionsBar.style.display = "none";
        }
      }

      function getSelectedCount() {
        let count = 0;
        count += Object.keys(selectedQuestions.english).filter(
          (key) => selectedQuestions.english[key],
        ).length;
        count += Object.keys(selectedQuestions.arabic).filter(
          (key) => selectedQuestions.arabic[key],
        ).length;
        return count;
      }

      function deleteSelectedQuestions() {
        const selectedCount = getSelectedCount();
        if (selectedCount === 0) {
          alert("No questions selected!");
          return;
        }

        if (
          !confirm(
            `Are you sure you want to delete ${selectedCount} selected question(s)?`,
          )
        ) {
          return;
        }

        const deletePromises = [];

        Object.entries(selectedQuestions.english).forEach(
          ([checkboxId, isSelected]) => {
            if (isSelected) {
              const parts = checkboxId.split("_");
              if (parts.length >= 4) {
                const language = parts[0];
                const type = parts[1];
                const category = parts[2];
                const questionId = parts.slice(3).join("_");
                const path = `admin/questions/${language}/${type}/${category}/${questionId}`;
                deletePromises.push(database.ref(path).remove());
              }
            }
          },
        );

        Object.entries(selectedQuestions.arabic).forEach(
          ([checkboxId, isSelected]) => {
            if (isSelected) {
              const parts = checkboxId.split("_");
              if (parts.length >= 4) {
                const language = parts[0];
                const type = parts[1];
                const category = parts[2];
                const questionId = parts.slice(3).join("_");
                const path = `admin/questions/${language}/${type}/${category}/${questionId}`;
                deletePromises.push(database.ref(path).remove());
              }
            }
          },
        );

        Promise.all(deletePromises)
          .then(() => {
            alert(`Successfully deleted ${selectedCount} question(s)!`);
            loadQuestions();
            loadDashboardStats();
          })
          .catch((error) => {
            alert("Error deleting questions: " + error.message);
          });
      }

      function clearSelections() {
        selectedQuestions.english = {};
        selectedQuestions.arabic = {};

        document.querySelectorAll(".question-checkbox").forEach((checkbox) => {
          checkbox.checked = false;
        });

        document
          .querySelectorAll("#selectAllEnglish, #selectAllArabic")
          .forEach((checkbox) => {
            checkbox.checked = false;
            checkbox.indeterminate = false;
          });

        updateBulkActionsBar();
      }

      function loadCategoriesForBulkDelete() {
        const language = document.getElementById(
          "categoryLanguageSelect",
        ).value;
        const select = document.getElementById("categorySelectBulk");

        database
          .ref(`admin/questions/categories/${language}`)
          .once("value")
          .then((snapshot) => {
            const categories = snapshot.val() || {};
            select.innerHTML =
              '<option value="">-- Select Category --</option>';

            Object.keys(categories).forEach((category) => {
              const option = document.createElement("option");
              option.value = category;
              option.textContent =
                category.charAt(0).toUpperCase() + category.slice(1);
              select.appendChild(option);
            });
          });
      }

      function enableCategoryDelete() {
        const select = document.getElementById("categorySelectBulk");
        const button = document.getElementById("deleteCategoryBtn");
        button.disabled = !select.value;
      }

      function deleteEntireCategory() {
        const language = document.getElementById(
          "categoryLanguageSelect",
        ).value;
        const category = document.getElementById("categorySelectBulk").value;

        if (!category) {
          alert("Please select a category!");
          return;
        }

        if (
          !confirm(
            `Are you sure you want to delete ALL questions in the "${category}" category (${language})?\n\nThis will delete all simple and sponsored questions in this category!`,
          )
        ) {
          return;
        }

        const promises = [
          database
            .ref(`admin/questions/${language}/simple/${category}`)
            .once("value"),
          database
            .ref(`admin/questions/${language}/sponsored/${category}`)
            .once("value"),
        ];

        Promise.all(promises).then(([simpleSnap, sponsoredSnap]) => {
          const simpleCount = simpleSnap.val()
            ? Object.keys(simpleSnap.val()).length
            : 0;
          const sponsoredCount = sponsoredSnap.val()
            ? Object.keys(sponsoredSnap.val()).length
            : 0;
          const totalCount = simpleCount + sponsoredCount;

          if (totalCount === 0) {
            alert("This category is already empty!");
            return;
          }

          if (
            confirm(
              `Found ${totalCount} questions in "${category}" category.\n\nClick OK to permanently delete all ${totalCount} questions.`,
            )
          ) {
            const deletePromises = [
              database
                .ref(`admin/questions/${language}/simple/${category}`)
                .remove(),
              database
                .ref(`admin/questions/${language}/sponsored/${category}`)
                .remove(),
            ];

            Promise.all(deletePromises)
              .then(() => {
                alert(
                  `Successfully deleted ${totalCount} questions from "${category}" category!`,
                );
                database
                  .ref(`admin/questions/categories/${language}/${category}`)
                  .remove();
                loadQuestions();
                loadDashboardStats();
                loadCategoriesForBulkDelete();
                enableCategoryDelete();
              })
              .catch((error) => {
                alert("Error deleting category: " + error.message);
              });
          }
        });
      }

      function editQuestion(key, language, type, category, option1, option2) {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "editQuestionModal";

        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Edit Question</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="editQuestionForm">
                  <div class="mb-3">
                    <label class="form-label">Category</label>
                    <input type="text" class="form-control" id="editCategory" value="${category}" readonly>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Language</label>
                    <input type="text" class="form-control" id="editLanguage" value="${language}" readonly>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Type</label>
                    <input type="text" class="form-control" id="editType" value="${type}" readonly>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Option 1</label>
                    <input type="text" class="form-control" id="editOption1" value="${option1}" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Option 2</label>
                    <input type="text" class="form-control" id="editOption2" value="${option2}" required>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary-custom" onclick="updateQuestion('${key}', '${language}', '${type}', '${category}')">
                  Update Question
                </button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      function updateQuestion(key, language, type, category) {
        const option1 = document.getElementById("editOption1").value;
        const option2 = document.getElementById("editOption2").value;

        if (!option1 || !option2) {
          alert("Please fill in all fields");
          return;
        }

        const questionData = {
          options: [option1, option2],
          updatedAt: Date.now(),
        };

        const path = `admin/questions/${language}/${type}/${category}/${key}`;
        database
          .ref(path)
          .update(questionData)
          .then(() => {
            alert("Question updated successfully!");
            bootstrap.Modal.getInstance(
              document.querySelector("#editQuestionModal"),
            ).hide();
            loadQuestions();
            loadDashboardStats();
          })
          .catch((error) => {
            alert("Error updating question: " + error.message);
          });
      }

      function deleteQuestion(key, language, type, category) {
        if (confirm("Are you sure you want to delete this question?")) {
          const path = `admin/questions/${language}/${type}/${category}`;
          database
            .ref(path + "/" + key)
            .remove()
            .then(() => {
              alert("Question deleted successfully!");
              loadQuestions();
              loadDashboardStats();
            })
            .catch((error) => {
              alert("Error deleting question: " + error.message);
            });
        }
      }

      // Image Upload Handler
      function uploadImage(fileInputId, targetInputId, modalId) {
        return new Promise((resolve, reject) => {
          const fileInput = document.getElementById(fileInputId);
          if (!fileInput) {
            reject(new Error("File input not found."));
            return;
          }
          const file = fileInput.files && fileInput.files[0];
          if (!file) {
            resolve("");
            return;
          }

          const storageRef = storage.ref(`images/${Date.now()}_${file.name}`);
          const uploadTask = storageRef.put(file);

          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload is ${progress}% done`);
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            () => {
              uploadTask.snapshot.ref
                .getDownloadURL()
                .then((downloadURL) => {
                  const targetInput = document.getElementById(targetInputId);
                  if (targetInput) {
                    targetInput.value = downloadURL;
                    resolve(downloadURL);
                  } else {
                    reject(new Error("Target input not found."));
                  }
                })
                .catch((error) => {
                  reject(error);
                });
            },
          );
        });
      }

      // Ads Management
      function showAddAdModal() {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "addAdModal";
        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Add New Advertisement</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="addAdForm">
                  <div class="mb-3">
                    <label class="form-label">Ad Title</label>
                    <input type="text" class="form-control" id="adTitle" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Ad Content/Text</label>
                    <textarea class="form-control" id="adContent" rows="3" required></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Ad URL (optional)</label>
                    <input type="url" class="form-control" id="adUrl" placeholder="https://example.com">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Ad Image</label>
                    <div class="input-group">
                      <input type="text" class="form-control" id="adImage" placeholder="Choose an image..." readonly>
                      <input type="file" accept="image/*" style="display:none" id="adImageFile" onchange="uploadImage('adImageFile', 'adImage', 'addAdModal').then(url => console.log('Image URL:', url)).catch(err => alert('Image upload error: ' + err.message))">
                      <button type="button" class="btn btn-secondary" onclick="document.getElementById('adImageFile').click()">Choose Image</button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="adStatus">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary-custom" onclick="addAd()">Add Advertisement</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      async function addAd() {
        const title = document.getElementById("adTitle").value;
        const content = document.getElementById("adContent").value;
        const url = document.getElementById("adUrl").value;
        const imageInput = document.getElementById("adImage");
        const status = document.getElementById("adStatus").value;

        if (!title || !content) {
          alert("Please fill in title and content fields");
          return;
        }

        let image = "";
        if (imageInput.value) {
          try {
            image = await uploadImage("adImageFile", "adImage", "addAdModal");
          } catch (error) {
            alert("Error uploading image: " + error.message);
            return;
          }
        }

        const adData = {
          title: title,
          content: content,
          url: url || "",
          image: image,
          status: status,
          createdAt: Date.now(),
          id: Date.now().toString(),
        };

        try {
          await database.ref("admin/ads").push(adData);
          alert("Advertisement added successfully!");
          bootstrap.Modal.getInstance(document.querySelector(".modal")).hide();
          loadAds();
          loadDashboardStats();
        } catch (error) {
          alert("Error adding advertisement: " + error.message);
        }
      }

      function loadAds() {
        database.ref("admin/ads").once("value", (snapshot) => {
          const ads = snapshot.val() || {};
          const tbody = document.getElementById("adsTableBody");
          tbody.innerHTML = "";

          Object.entries(ads).forEach(([key, ad]) => {
            const row = document.createElement("tr");
            const statusBadge =
              ad.status === "active"
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';

            row.innerHTML = `
              <td>${ad.id || key}</td>
              <td>${ad.title}</td>
              <td>${ad.content.substring(0, 50)}${ad.content.length > 50 ? "..." : ""}</td>
              <td>${ad.image ? `<img src="${ad.image}" alt="Ad Image" style="max-width:60px;max-height:40px;object-fit:cover;">` : ""}</td>
              <td>${statusBadge}</td>
              <td>
                <button class="action-btn btn-edit" onclick="editAd('${key}', '${ad.title}', '${ad.content}', '${ad.url || ""}', '${ad.status}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteAd('${key}')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            `;
            tbody.appendChild(row);
          });
        });
      }

      function editAd(
        key,
        currentTitle,
        currentContent,
        currentUrl,
        currentStatus,
      ) {
        database
          .ref("admin/ads/" + key)
          .once("value")
          .then((snapshot) => {
            const ad = snapshot.val() || {};
            const currentImage = ad.image || "";
            const modal = document.createElement("div");
            modal.className = "modal fade";
            modal.id = "editAdModal";
            modal.innerHTML = `
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Edit Advertisement</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <form id="editAdForm">
                    <div class="mb-3">
                      <label class="form-label">Ad Title</label>
                      <input type="text" class="form-control" id="editAdTitle" value="${currentTitle}" required>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Ad Content/Text</label>
                      <textarea class="form-control" id="editAdContent" rows="3" required>${currentContent}</textarea>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Ad URL (optional)</label>
                      <input type="url" class="form-control" id="editAdUrl" value="${currentUrl}">
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Ad Image</label>
                      <div class="input-group">
                        <input type="text" class="form-control" id="editAdImage" value="${currentImage}" placeholder="Choose an image..." readonly>
                        <input type="file" accept="image/*" style="display:none" id="editAdImageFile" onchange="uploadImage('editAdImageFile', 'editAdImage', 'editAdModal').then(url => console.log('Image URL:', url)).catch(err => alert('Image upload error: ' + err.message))">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('editAdImageFile').click()">Choose Image</button>
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Status</label>
                      <select class="form-control" id="editAdStatus">
                        <option value="active" ${currentStatus === "active" ? "selected" : ""}>Active</option>
                        <option value="inactive" ${currentStatus === "inactive" ? "selected" : ""}>Inactive</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-primary-custom" onclick="updateAd('${key}')">Update Advertisement</button>
                </div>
              </div>
            </div>
          `;
            document.body.appendChild(modal);
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

            modal.addEventListener("hidden.bs.modal", () => {
              document.body.removeChild(modal);
            });
          });
      }

      async function updateAd(key) {
        const title = document.getElementById("editAdTitle").value;
        const content = document.getElementById("editAdContent").value;
        const url = document.getElementById("editAdUrl").value;
        const imageInput = document.getElementById("editAdImage");
        const status = document.getElementById("editAdStatus").value;

        if (!title || !content) {
          alert("Please fill in title and content fields");
          return;
        }

        let image = imageInput ? imageInput.value : "";
        const fileInput = document.getElementById("editAdImageFile");
        if (fileInput && fileInput.files && fileInput.files[0]) {
          try {
            image = await uploadImage(
              "editAdImageFile",
              "editAdImage",
              "editAdModal",
            );
          } catch (error) {
            alert("Error uploading image: " + error.message);
            return;
          }
        }

        const adData = {
          title: title,
          content: content,
          url: url || "",
          image: image,
          status: status,
          updatedAt: Date.now(),
        };

        try {
          await database.ref("admin/ads/" + key).update(adData);
          alert("Advertisement updated successfully!");
          bootstrap.Modal.getInstance(document.querySelector(".modal")).hide();
          loadAds();
          loadDashboardStats();
        } catch (error) {
          alert("Error updating advertisement: " + error.message);
        }
      }

      function deleteAd(key) {
        if (confirm("Are you sure you want to delete this advertisement?")) {
          database
            .ref("admin/ads/" + key)
            .remove()
            .then(() => {
              alert("Advertisement deleted successfully!");
              loadAds();
              loadDashboardStats();
            })
            .catch((error) => {
              alert("Error deleting advertisement: " + error.message);
            });
        }
      }

      // Sponsored Ads Management
      function showAddSponsoredAdModal() {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "addSponsoredAdModal";
        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Add New Sponsored Ad</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="addSponsoredAdForm">
                  <div class="mb-3">
                    <label class="form-label">Ad Title</label>
                    <input type="text" class="form-control" id="sponsoredAdTitle" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Question Text</label>
                    <input type="text" class="form-control" id="sponsoredAdQuestion" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Ad Image</label>
                    <div class="input-group">
                      <input type="text" class="form-control" id="sponsoredAdImage" placeholder="Choose an image..." readonly>
                      <input type="file" accept="image/*" style="display:none" id="sponsoredAdImageFile" onchange="uploadImage('sponsoredAdImageFile', 'sponsoredAdImage', 'addSponsoredAdModal').then(url => console.log('Image URL:', url)).catch(err => alert('Image upload error: ' + err.message))">
                      <button type="button" class="btn btn-secondary" onclick="document.getElementById('sponsoredAdImageFile').click()">Choose Image</button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="sponsoredAdStatus">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary-custom" onclick="addSponsoredAd()">Add Sponsored Ad</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      async function addSponsoredAd() {
        const title = document.getElementById("sponsoredAdTitle").value;
        const question = document.getElementById("sponsoredAdQuestion").value;
        const imageInput = document.getElementById("sponsoredAdImage");
        const status = document.getElementById("sponsoredAdStatus").value;

        if (!title || !question) {
          alert("Please fill in title and question fields");
          return;
        }

        let image = "";
        if (imageInput.value) {
          try {
            image = await uploadImage(
              "sponsoredAdImageFile",
              "sponsoredAdImage",
              "addSponsoredAdModal",
            );
          } catch (error) {
            alert("Error uploading image: " + error.message);
            return;
          }
        }

        const sponsoredAdData = {
          title: title,
          question: question,
          image: image,
          status: status,
          createdAt: Date.now(),
          id: Date.now().toString(),
        };

        try {
          await database.ref("admin/sponsored_ads").push(sponsoredAdData);
          alert("Sponsored Ad added successfully!");
          bootstrap.Modal.getInstance(document.querySelector(".modal")).hide();
          loadSponsoredAds();
          loadDashboardStats();
        } catch (error) {
          alert("Error adding sponsored ad: " + error.message);
        }
      }

      function loadSponsoredAds() {
        database.ref("admin/sponsored_ads").once("value", (snapshot) => {
          const sponsoredAds = snapshot.val() || {};
          const tbody = document.getElementById("sponsoredAdsTableBody");
          tbody.innerHTML = "";

          Object.entries(sponsoredAds).forEach(([key, ad]) => {
            const row = document.createElement("tr");
            const statusBadge =
              ad.status === "active"
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';

            row.innerHTML = `
              <td>${ad.id || key}</td>
              <td>${ad.title}</td>
              <td>${ad.question.substring(0, 50)}${ad.question.length > 50 ? "..." : ""}</td>
              <td>${ad.image ? `<img src="${ad.image}" alt="Ad Image" style="max-width:60px;max-height:40px;object-fit:cover;">` : ""}</td>
              <td>${statusBadge}</td>
              <td>
                <button class="action-btn btn-edit" onclick="editSponsoredAd('${key}', '${ad.title}', '${ad.question}', '${ad.image || ""}', '${ad.status}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteSponsoredAd('${key}')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            `;
            tbody.appendChild(row);
          });
        });
      }

      function editSponsoredAd(
        key,
        currentTitle,
        currentQuestion,
        currentImage,
        currentStatus,
      ) {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "editSponsoredAdModal";
        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Edit Sponsored Ad</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="editSponsoredAdForm">
                  <div class="mb-3">
                    <label class="form-label">Ad Title</label>
                    <input type="text" class="form-control" id="editSponsoredAdTitle" value="${currentTitle}" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Question Text</label>
                    <input type="text" class="form-control" id="editSponsoredAdQuestion" value="${currentQuestion}" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Ad Image</label>
                    <div class="input-group">
                      <input type="text" class="form-control" id="editSponsoredAdImage" value="${currentImage}" placeholder="Choose an image..." readonly>
                      <input type="file" accept="image/*" style="display:none" id="editSponsoredAdImageFile" onchange="uploadImage('editSponsoredAdImageFile', 'editSponsoredAdImage', 'editSponsoredAdModal').then(url => console.log('Image URL:', url)).catch(err => alert('Image upload error: ' + err.message))">
                      <button type="button" class="btn btn-secondary" onclick="document.getElementById('editSponsoredAdImageFile').click()">Choose Image</button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="editSponsoredAdStatus">
                      <option value="active" ${currentStatus === "active" ? "selected" : ""}>Active</option>
                      <option value="inactive" ${currentStatus === "inactive" ? "selected" : ""}>Inactive</option>
                    </select>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary-custom" onclick="updateSponsoredAd('${key}')">Update Sponsored Ad</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      async function updateSponsoredAd(key) {
        const title = document.getElementById("editSponsoredAdTitle").value;
        const question = document.getElementById(
          "editSponsoredAdQuestion",
        ).value;
        const imageInput = document.getElementById("editSponsoredAdImage");
        const status = document.getElementById("editSponsoredAdStatus").value;

        if (!title || !question) {
          alert("Please fill in title and question fields");
          return;
        }

        let image = imageInput ? imageInput.value : "";
        const fileInput = document.getElementById("editSponsoredAdImageFile");
        if (fileInput && fileInput.files && fileInput.files[0]) {
          try {
            image = await uploadImage(
              "editSponsoredAdImageFile",
              "editSponsoredAdImage",
              "editSponsoredAdModal",
            );
          } catch (error) {
            alert("Error uploading image: " + error.message);
            return;
          }
        }

        const sponsoredAdData = {
          title: title,
          question: question,
          image: image,
          status: status,
          updatedAt: Date.now(),
        };

        try {
          await database
            .ref("admin/sponsored_ads/" + key)
            .update(sponsoredAdData);
          alert("Sponsored Ad updated successfully!");
          bootstrap.Modal.getInstance(document.querySelector(".modal")).hide();
          loadSponsoredAds();
          loadDashboardStats();
        } catch (error) {
          alert("Error updating sponsored ad: " + error.message);
        }
      }

      function deleteSponsoredAd(key) {
        if (confirm("Are you sure you want to delete this sponsored ad?")) {
          database
            .ref("admin/sponsored_ads/" + key)
            .remove()
            .then(() => {
              alert("Sponsored Ad deleted successfully!");
              loadSponsoredAds();
              loadDashboardStats();
            })
            .catch((error) => {
              alert("Error deleting sponsored ad: " + error.message);
            });
        }
      }

      // Games Management
      function loadGames() {
        database.ref("games").once("value", (snapshot) => {
          const games = snapshot.val() || {};
          const tbody = document.getElementById("gamesTableBody");
          tbody.innerHTML = "";

          Object.entries(games).forEach(([key, game]) => {
            const row = document.createElement("tr");
            const playerCount = game.players
              ? Object.keys(game.players).length
              : 0;
            const status = game.gameEnded
              ? "Ended"
              : game.gameStarted
                ? "In Progress"
                : "Waiting";
            const statusClass = game.gameEnded
              ? "bg-secondary"
              : game.gameStarted
                ? "bg-warning"
                : "bg-success";
            const createdDate = new Date(game.createdAt || 0).toLocaleString();

            row.innerHTML = `
              <td>${key}</td>
              <td>${game.host || "Unknown"}</td>
              <td>${playerCount}</td>
              <td><span class="badge ${statusClass}">${status}</span></td>
              <td>${createdDate}</td>
              <td>
                <button class="action-btn btn-delete" onclick="deleteGame('${key}')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            `;
            tbody.appendChild(row);
          });
        });
      }

      function deleteGame(key) {
        if (confirm("Are you sure you want to delete this game?")) {
          database
            .ref("games/" + key)
            .remove()
            .then(() => {
              alert("Game deleted successfully!");
              loadGames();
              loadDashboardStats();
            })
            .catch((error) => {
              alert("Error deleting game: " + error.message);
            });
        }
      }

      // Settings Management
      function saveSettings() {
        const defaultQuestionLimit = document.getElementById(
          "defaultQuestionLimit",
        ).value;
        const maxPlayers = document.getElementById("maxPlayers").value;
        const adRotationInterval =
          document.getElementById("adRotationInterval").value;
        const enableAds = document.getElementById("enableAds").checked;

        const settings = {
          defaultQuestionLimit: parseInt(defaultQuestionLimit),
          maxPlayers: parseInt(maxPlayers),
          adRotationInterval: parseInt(adRotationInterval),
          enableAds: enableAds,
          updatedAt: Date.now(),
        };

        database
          .ref("admin/settings")
          .set(settings)
          .then(() => {
            alert("Settings saved successfully!");
          })
          .catch((error) => {
            alert("Error saving settings: " + error.message);
          });
      }

      function exportData() {
        Promise.all([
          database.ref("admin/questions").once("value"),
          database.ref("admin/ads").once("value"),
          database.ref("admin/sponsored_ads").once("value"),
          database.ref("games").once("value"),
        ])
          .then(([questionsSnap, adsSnap, sponsoredAdsSnap, gamesSnap]) => {
            const data = {
              questions: questionsSnap.val() || {},
              ads: adsSnap.val() || {},
              sponsored_ads: sponsoredAdsSnap.val() || {},
              games: gamesSnap.val() || {},
              exportedAt: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `spyfall-data-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          })
          .catch((error) => {
            alert("Error exporting data: " + error.message);
          });
      }

      // Cleanup Old Games logic
      function cleanupOldGames() {
        const days = 7;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (
          !confirm(
            `Delete all games ended more than ${days} days ago? This cannot be undone!`,
          )
        )
          return;

        database
          .ref("games")
          .once("value")
          .then((snapshot) => {
            const games = snapshot.val() || {};
            const toDelete = [];
            Object.entries(games).forEach(([key, game]) => {
              if (game.gameEnded && game.gameEnded < cutoff) {
                toDelete.push(key);
              }
            });

            if (toDelete.length === 0) {
              alert("No old games to delete.");
              return;
            }

            let deleted = 0;
            toDelete.forEach((key) => {
              database
                .ref("games/" + key)
                .remove()
                .then(() => {
                  deleted++;
                  if (deleted === toDelete.length) {
                    alert(`Deleted ${deleted} old games.`);
                    loadDashboardStats();
                  }
                });
            });
          });
      }

      // Language switcher
      document.addEventListener("DOMContentLoaded", function () {
        const lang = localStorage.getItem("lang") || "en";
        const cleanupBtnText = {
          en: "Cleanup Old Games",
          ar: "تنظيف الألعاب القديمة",
        };
        document.getElementById("cleanupBtnText").textContent =
          cleanupBtnText[lang];
      });

      // Spy Words Management Functions
      function showAddSpyWordModal() {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "addSpyWordModal";
        modal.innerHTML = `
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Add Spy Word</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="addSpyWordForm">
                  <div class="mb-3">
                    <label class="form-label">Language</label>
                    <select class="form-control" id="wordLanguage">
                      <option value="english">English</option>
                      <option value="arabic">Arabic</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Word/Phrase</label>
                    <input type="text" class="form-control" id="spyWord" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Category (optional)</label>
                    <input type="text" class="form-control" id="wordCategory" placeholder="e.g., Animals, Places, Objects">
                  </div>
                </form>
                <div id="spyWordModalExcelStatus" class="mt-2 small"></div>
              </div>
              <div class="modal-footer d-flex justify-content-between">
                <div>
                  <input type="file" id="spyWordExcelInputModal" style="display:none" accept=".xlsx, .xls" onchange="handleSpyWordExcelUploadFromModal(event)">
                  <button type="button" class="btn btn-outline-success" onclick="document.getElementById('spyWordExcelInputModal').click()">
                    <i class="fas fa-file-excel"></i> Add File (Excel)
                  </button>
                </div>
                <div>
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-primary-custom" onclick="addSpyWord()">Add Word</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      function addSpyWord() {
        const language = document.getElementById("wordLanguage").value;
        const word = document.getElementById("spyWord").value.trim();
        const category =
          document.getElementById("wordCategory").value.trim() || "general";

        if (!word) {
          alert("Please enter a word.");
          return;
        }

        const wordData = {
          word: word,
          category: category,
          language: language,
          createdAt: Date.now(),
          id: Date.now().toString(),
        };

        database
          .ref(`admin/spy-words/${language}`)
          .push(wordData)
          .then(() => {
            alert("Spy word added successfully!");
            bootstrap.Modal.getInstance(
              document.querySelector(".modal"),
            ).hide();
            loadSpyWords();
          })
          .catch((error) => {
            alert("Error adding word: " + error.message);
          });
      }

      function handleSpyWordExcelUploadFromModal(event) {
        const file = event.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById("spyWordModalExcelStatus");
        statusDiv.innerHTML = '<span class="text-primary">Processing...</span>';

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const language = document.getElementById("wordLanguage").value;
            let count = 0;

            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i];
              const word = row[0] ? row[0].toString().trim() : "";
              const category = row[1] ? row[1].toString().trim() : "general";

              if (word) {
                const wordData = {
                  word: word,
                  category: category || "general",
                  language: language,
                  createdAt: Date.now(),
                  id: Date.now().toString() + "_" + i,
                };
                await database
                  .ref(`admin/spy-words/${language}`)
                  .push(wordData);
                count++;
              }
            }

            if (count > 0) {
              alert(`${count} spy words added successfully from Excel!`);
              loadSpyWords();
            } else {
              alert("No valid data in file. Column A must have a word.");
            }

            statusDiv.innerHTML = "";
            event.target.value = "";
          } catch (err) {
            alert("Error reading file: " + err.message);
            statusDiv.innerHTML = "";
            event.target.value = "";
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function handleSpyWordExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById("spyWordExcelStatus");
        statusDiv.innerHTML = '<span class="text-primary">Processing...</span>';

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const language = document.getElementById("spyWordLanguage").value;
            let count = 0;

            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i];
              const word = row[0] ? row[0].toString().trim() : "";
              const category = row[1] ? row[1].toString().trim() : "general";

              if (word) {
                const wordData = {
                  word: word,
                  category: category || "general",
                  language: language,
                  createdAt: Date.now(),
                  id: Date.now().toString() + "_" + i,
                };
                await database
                  .ref(`admin/spy-words/${language}`)
                  .push(wordData);
                count++;
              }
            }

            if (count > 0) {
              alert(`${count} spy words added successfully from Excel!`);
              loadSpyWords();
            } else {
              alert("No valid data in file. Column A must have a word.");
            }

            statusDiv.innerHTML = "";
            event.target.value = "";
          } catch (err) {
            alert("Error reading file: " + err.message);
            statusDiv.innerHTML = "";
            event.target.value = "";
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function loadSpyWords() {
        const language = document.getElementById("spyWordLanguage").value;
        const tbody = document.getElementById("spyWordsTableBody");
        tbody.innerHTML = "";

        database
          .ref(`admin/spy-words/${language}`)
          .once("value")
          .then((snapshot) => {
            const words = snapshot.val() || {};

            if (Object.keys(words).length === 0) {
              tbody.innerHTML =
                '<tr><td colspan="5" class="text-center py-4">No spy words found. Add some words to get started.</td></tr>';
              return;
            }

            Object.entries(words).forEach(([key, wordData]) => {
              const row = document.createElement("tr");
              row.innerHTML = `
              <td>${wordData.id ? wordData.id.substring(0, 8) : key.substring(0, 8)}</td>
              <td>${wordData.word}</td>
              <td>${wordData.category || "general"}</td>
              <td>${wordData.language || language}</td>
              <td>
                <button class="action-btn btn-edit" onclick="editSpyWord('${key}', '${language}', '${wordData.word}', '${wordData.category}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteSpyWord('${key}', '${language}')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            `;
              tbody.appendChild(row);
            });
          });
      }

      function editSpyWord(key, language, currentWord, currentCategory) {
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "editSpyWordModal";
        modal.innerHTML = `
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Edit Spy Word</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="editSpyWordForm">
                  <div class="mb-3">
                    <label class="form-label">Word/Phrase</label>
                    <input type="text" class="form-control" id="editSpyWord" value="${currentWord}" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Category</label>
                    <input type="text" class="form-control" id="editWordCategory" value="${currentCategory}">
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary-custom" onclick="updateSpyWord('${key}', '${language}')">Update Word</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener("hidden.bs.modal", () => {
          document.body.removeChild(modal);
        });
      }

      function updateSpyWord(key, language) {
        const word = document.getElementById("editSpyWord").value.trim();
        const category =
          document.getElementById("editWordCategory").value.trim() || "general";

        if (!word) {
          alert("Please enter a word.");
          return;
        }

        database
          .ref(`admin/spy-words/${language}/${key}`)
          .update({
            word: word,
            category: category,
            updatedAt: Date.now(),
          })
          .then(() => {
            alert("Word updated successfully!");
            bootstrap.Modal.getInstance(
              document.querySelector(".modal"),
            ).hide();
            loadSpyWords();
          })
          .catch((error) => {
            alert("Error updating word: " + error.message);
          });
      }

      function deleteSpyWord(key, language) {
        if (confirm("Are you sure you want to delete this word?")) {
          database
            .ref(`admin/spy-words/${language}/${key}`)
            .remove()
            .then(() => {
              alert("Word deleted successfully!");
              loadSpyWords();
            })
            .catch((error) => {
              alert("Error deleting word: " + error.message);
            });
        }
      }
