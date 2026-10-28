import { leaveRequestService, type LeaveRequestApi } from '@/modules/hr/leave-requests'
import { mySpaceApi } from '../api/mySpaceApi'
import type {
  MyAbsenceInput,
  MyChecklistInput,
  MyProfileApi,
  MyTourApi
} from '../types/mySpace.types'

/** The server keeps a driver to their own requests; one page holds them all. */
const ABSENCES_PAGE_SIZE = 100

export const mySpaceService = {
  async profile(): Promise<MyProfileApi> {
    return (await mySpaceApi.profile()).data.data
  },
  async tour(): Promise<MyTourApi | null> {
    return (await mySpaceApi.tour()).data.data
  },
  async saveChecklist(input: MyChecklistInput): Promise<void> {
    await mySpaceApi.saveChecklist(input)
  },
  async absences(): Promise<LeaveRequestApi[]> {
    const page = await leaveRequestService.getAll({
      pageSize: ABSENCES_PAGE_SIZE,
      sortBy: 'submittedAt',
      sortDirection: 'DESC'
    })
    return page.data.items
  },
  async requestAbsence(employeeNo: string, input: MyAbsenceInput): Promise<LeaveRequestApi> {
    return leaveRequestService.create({ employeeNo, ...input })
  }
}
