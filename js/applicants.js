document.addEventListener("DOMContentLoaded", function () {
  const table = document.getElementById("applicantTable");
  const rows = table.querySelectorAll("tbody tr");

  const filterSource = document.getElementById("filterSource");
  const filterStatus = document.getElementById("filterStatus");
  const filterDate = document.getElementById("filterDate");
  const searchInput = document.getElementById("searchInput");

  function applyFilters() {
    const sourceValue = filterSource.value.toLowerCase();
    const statusValue = filterStatus.value.toLowerCase();
    const dateValue = filterDate.value;
    const searchValue = searchInput.value.toLowerCase();

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const name = cells[0].textContent.toLowerCase();
      const course = cells[1].textContent.toLowerCase();
      const appDate = cells[2].textContent;
      const source = cells[3].textContent.toLowerCase();
      const status = cells[6].textContent.toLowerCase();

      const matchesSource = sourceValue === "" || source.includes(sourceValue);
      const matchesStatus = statusValue === "" || status.includes(statusValue);
      const matchesDate = dateValue === "" || appDate === dateValue;
      const matchesSearch =
        name.includes(searchValue) || course.includes(searchValue);

      if (matchesSource && matchesStatus && matchesDate && matchesSearch) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  }

  // Event listeners
  filterSource.addEventListener("change", applyFilters);
  filterStatus.addEventListener("change", applyFilters);
  filterDate.addEventListener("change", applyFilters);
  searchInput.addEventListener("keyup", applyFilters);
});
