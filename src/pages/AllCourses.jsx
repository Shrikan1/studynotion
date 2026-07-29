import { useEffect, useState } from "react"
import CourseCard from "../components/core/Catalog/Course_Card"
import { getAllCourses } from "../services/operations/courseDetailsAPI"

function AllCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true)
      const result = await getAllCourses()
      setCourses(result || [])
      setLoading(false)
    }

    fetchCourses()
  }, [])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-richblack-900">
      <div className="mx-auto w-11/12 max-w-maxContent py-12">
        <div className="mb-10">
          <p className="mb-2 text-sm text-richblack-300">Home / Courses</p>
          <h1 className="text-3xl font-semibold text-richblack-5">
            All Courses
          </h1>
          <p className="mt-3 max-w-[680px] text-richblack-200">
            Browse published courses and choose what you want to learn next.
          </p>
        </div>

        {loading ? (
          <div className="grid min-h-[220px] place-items-center">
            <div className="spinner"></div>
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} Height="h-[220px]" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-richblack-700 bg-richblack-800 p-8 text-center text-richblack-200">
            No published courses are available right now.
          </div>
        )}
      </div>
    </div>
  )
}

export default AllCourses
