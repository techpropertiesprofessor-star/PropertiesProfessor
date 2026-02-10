import React from 'react';
import { format } from 'date-fns';
import { FiX } from 'react-icons/fi';

export default function UpcomingHolidaysCard({ holidays, markedDates, onHolidayClick }) {
  return (
    <div className="bg-white/90 rounded-2xl shadow-xl p-4 md:p-6 border border-yellow-100">
      <h2 className="text-lg font-bold text-yellow-700 mb-4 flex items-center gap-2">
        <span role="img" aria-label="holiday">🎉</span> Upcoming Holidays
      </h2>
      <ul className="space-y-3">
        {holidays.length === 0 && (
          <li className="text-gray-400 text-sm">No holidays found.</li>
        )}
        {holidays.map((holiday) => {
          // Find scheduled content for this holiday date
          const scheduled = markedDates.filter(md => {
            const hd = new Date(holiday.date);
            const mdDate = new Date(md.marked_date);
            return hd.getFullYear() === mdDate.getFullYear() &&
              hd.getMonth() === mdDate.getMonth() &&
              hd.getDate() === mdDate.getDate();
          });
          return (
            <li
              key={holiday._id || holiday.date}
              className="flex flex-col gap-1 p-2 rounded-lg hover:bg-yellow-100 transition cursor-pointer border border-transparent hover:border-yellow-300"
              onClick={() => onHolidayClick && onHolidayClick({ ...holiday, scheduled })}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-yellow-800 text-base">
                  {format(new Date(holiday.date), 'MMM dd')}
                </span>
                <span className="text-gray-700 text-sm">{holiday.name}</span>
              </div>
              {scheduled.length > 0 && (
                <div className="ml-7 mt-1">
                  <span className="text-xs text-indigo-700 font-semibold">Scheduled Content:</span>
                  <ul className="list-disc ml-4">
                    {scheduled.map(ev => (
                      <li key={ev.id || ev._id} className="text-xs text-gray-700">
                        {ev.content_title || 'Untitled'}
                        {ev.note ? <span className="ml-2 text-gray-400">({ev.note})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
