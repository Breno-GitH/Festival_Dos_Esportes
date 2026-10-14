(function (root, factory) {
    const api = factory(root.SkateOfficialProceduralCourse
        || (typeof require === "function" ? require("./official_procedural_course.js") : null));
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateCourse = api;
})(typeof globalThis === "object" ? globalThis : this, function (officialCourse) {
    if (!officialCourse?.procedural) {
        throw new Error("SkateOfficialProceduralCourse must load before SkateCourse");
    }
    return Object.freeze({ COURSE: officialCourse });
});
