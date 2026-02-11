import React from 'react';
import { format } from 'date-fns';
import { FiX } from 'react-icons/fi';

export default function UpcomingHolidaysCard({ holidays, markedDates, onHolidayClick }) {
  return (
    <div className="bg-white/90 rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-yellow-100 w-full max-w-full">
      <h2 className="text-lg font-bold text-yellow-700 mb-4 flex items-center gap-2 break-words">
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
              className="flex flex-col gap-1 p-2 rounded-lg hover:bg-yellow-100 transition cursor-pointer border border-transparent hover:border-yellow-300 break-words"
              onClick={() => onHolidayClick && onHolidayClick({ ...holiday, scheduled })}
            >
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3">
                <span className="font-bold text-yellow-800 text-base whitespace-nowrap">
                  {format(new Date(holiday.date), 'MMM dd')}
                </span>
                <span className="text-gray-700 text-sm break-words">{holiday.name}</span>
              </div>
              {scheduled.length > 0 && (
                <div className="ml-0 xs:ml-7 mt-1">
                  <span className="text-xs text-indigo-700 font-semibold">Scheduled Content:</span>
                  <ul className="list-disc ml-4">
                    {scheduled.map(ev => (
                      <li key={ev.id || ev._id} className="text-xs text-gray-700 break-words">
                        {ev.content_title || 'Untitled'}
                        {ev.note ? <span className="ml-2 text-gray-400 break-words">({ev.note})</span> : null}
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
