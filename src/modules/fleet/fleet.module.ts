import {
  Activity,
  BellRing,
  Boxes,
  Building,
  Car,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Droplets,
  Fence,
  FileChartColumn,
  FileText,
  Files,
  FolderOpen,
  Fuel,
  Gauge,
  Gavel,
  GraduationCap,
  Handshake,
  IdCard,
  LayoutDashboard,
  Link2,
  ListChecks,
  Map,
  MapPin,
  MapPinned,
  Package,
  Radio,
  Receipt,
  Route,
  Scale,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Truck,
  UserCheck,
  UserRound
} from '@lucide/vue'
import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'
import { registerSearchableEntity } from '@/core/search/searchRegistry'
import { formatDate } from '@/utils/format'
import { documentService, type DocumentApi } from './documents'
import { driverService, type DriverApi } from './drivers'
import { tripService, type TripApi } from './trips'
import { vehicleService, type VehicleApi } from './vehicles'

const FLEET_MENU_ORDER = 30

export function registerFleetModule(): void {
  registerFeatureRoutes({
    ALERT: { to: '/fleet/alerts', menuKey: 'alert' },
    FLEETDASHBOARD: { to: '/fleet/dashboard', menuKey: 'fleetDashboard' },
    LIVEMAP: { to: '/fleet/live-map', menuKey: 'liveMap' },
    FLEETREPORT: { to: '/fleet/reports', menuKey: 'fleetReport' },
    TRIP: { to: '/fleet/trips', menuKey: 'trip' },
    VEHICLE: { to: '/fleet/vehicles', menuKey: 'vehicle' },
    COUPLING: { to: '/fleet/couplings', menuKey: 'coupling' },
    DRIVERASSIGNMENT: { to: '/fleet/driver-assignments', menuKey: 'driverAssignment' },
    DRIVER: { to: '/fleet/drivers', menuKey: 'driver' },
    FLEETSTATUS: { to: '/fleet/fleet-status', menuKey: 'fleetStatus' },
    DOCUMENT: { to: '/fleet/documents', menuKey: 'document' },
    COMPANYDOCUMENT: { to: '/fleet/company-documents', menuKey: 'companyDocument' },
    INSURANCEPOLICY: { to: '/fleet/insurance-policies', menuKey: 'insurancePolicy' },
    CLAIM: { to: '/fleet/claims', menuKey: 'claim' },
    INFRACTION: { to: '/fleet/infractions', menuKey: 'infraction' },
    TRAINING: { to: '/fleet/trainings', menuKey: 'training' },
    INFRACTIONTYPE: { to: '/fleet/infraction-types', menuKey: 'infractionType' },
    ROUTEDEVIATION: { to: '/fleet/route-deviations', menuKey: 'routeDeviation' },
    DEVIATIONTYPE: { to: '/fleet/deviation-types', menuKey: 'deviationType' },
    ALERTRULE: { to: '/fleet/alert-rules', menuKey: 'alertRule' },
    FUELREFILL: { to: '/fleet/fuel-refills', menuKey: 'fuelRefill' },
    FUELCONSUMPTION: { to: '/fleet/fuel-consumption', menuKey: 'fuelConsumption' },
    FUELGAPCAUSE: { to: '/fleet/fuel-gap-causes', menuKey: 'fuelGapCause' },
    FUELCARD: { to: '/fleet/fuel-cards', menuKey: 'fuelCard' },
    TELEMATICS: { to: '/fleet/telematics-events', menuKey: 'telematicsEvent' },
    TELEMATICSEVENTTYPE: { to: '/fleet/telematics-event-types', menuKey: 'telematicsEventType' },
    ROADCHECKLIST: { to: '/fleet/road-checklists', menuKey: 'roadChecklist' },
    DEPARTUREAUTHORIZATION: {
      to: '/fleet/departure-authorizations',
      menuKey: 'departureAuthorization'
    },
    INSPECTION: { to: '/fleet/inspections', menuKey: 'inspection' },
    CHECKPOINT: { to: '/fleet/check-points', menuKey: 'checkPoint' },
    INSPECTIONITEM: { to: '/fleet/inspection-items', menuKey: 'inspectionItem' },
    FUELREFERENCE: { to: '/fleet/fuel-references', menuKey: 'fuelReference' },
    SITE: { to: '/fleet/sites', menuKey: 'site' },
    ROUTETEMPLATE: { to: '/fleet/route-templates', menuKey: 'routeTemplate' },
    PROVIDER: { to: '/fleet/providers', menuKey: 'provider' },
    VEHICLETYPE: { to: '/fleet/vehicle-types', menuKey: 'vehicleType' },
    EQUIPMENTTYPE: { to: '/fleet/equipment-types', menuKey: 'equipmentType' },
    SITETYPE: { to: '/fleet/site-types', menuKey: 'siteType' },
    PROVIDERTYPE: { to: '/fleet/provider-types', menuKey: 'providerType' },
    DOCUMENTTYPE: { to: '/fleet/document-types', menuKey: 'documentType' },
    FLEETSETTINGS: { to: '/fleet/settings', menuKey: 'fleetSettings' }
  })

  registerNavMenu({
    labelKey: 'nav.fleet',
    order: FLEET_MENU_ORDER,
    subItems: [
      {
        labelKey: 'nav.alerts',
        to: '/fleet/alerts',
        group: 'nav.group.overview',
        icon: BellRing,
        menuKey: 'alert'
      },
      {
        labelKey: 'nav.fleetDashboard',
        to: '/fleet/dashboard',
        group: 'nav.group.overview',
        icon: LayoutDashboard,
        menuKey: 'fleetDashboard'
      },
      {
        labelKey: 'nav.liveMap',
        to: '/fleet/live-map',
        group: 'nav.group.overview',
        icon: MapPin,
        menuKey: 'liveMap'
      },
      {
        labelKey: 'nav.fleetReports',
        to: '/fleet/reports',
        group: 'nav.group.overview',
        icon: FileChartColumn,
        menuKey: 'fleetReport'
      },
      {
        labelKey: 'nav.trips',
        to: '/fleet/trips',
        group: 'nav.group.operations',
        icon: Package,
        menuKey: 'trip'
      },
      {
        labelKey: 'nav.departureAuthorizations',
        to: '/fleet/departure-authorizations',
        group: 'nav.group.operations',
        icon: DoorOpen,
        menuKey: 'departureAuthorization'
      },
      {
        labelKey: 'nav.routeDeviations',
        to: '/fleet/route-deviations',
        group: 'nav.group.operations',
        icon: Route,
        menuKey: 'routeDeviation'
      },
      {
        labelKey: 'nav.telematicsEvents',
        to: '/fleet/telematics-events',
        group: 'nav.group.operations',
        icon: Radio,
        menuKey: 'telematicsEvent'
      },
      {
        labelKey: 'nav.vehicles',
        to: '/fleet/vehicles',
        group: 'nav.group.vehicles',
        icon: Truck,
        menuKey: 'vehicle'
      },
      {
        labelKey: 'nav.couplings',
        to: '/fleet/couplings',
        group: 'nav.group.vehicles',
        icon: Link2,
        menuKey: 'coupling'
      },
      {
        labelKey: 'nav.driverAssignments',
        to: '/fleet/driver-assignments',
        group: 'nav.group.drivers',
        icon: UserCheck,
        menuKey: 'driverAssignment'
      },
      {
        labelKey: 'nav.drivers',
        to: '/fleet/drivers',
        group: 'nav.group.drivers',
        icon: IdCard,
        menuKey: 'driver'
      },
      {
        labelKey: 'nav.fleetStatus',
        to: '/fleet/fleet-status',
        group: 'nav.group.vehicles',
        icon: ClipboardList,
        menuKey: 'fleetStatus'
      },
      {
        labelKey: 'nav.fuelRefills',
        to: '/fleet/fuel-refills',
        group: 'nav.group.fuel',
        icon: Fuel,
        menuKey: 'fuelRefill'
      },
      {
        labelKey: 'nav.fuelConsumption',
        to: '/fleet/fuel-consumption',
        group: 'nav.group.fuel',
        icon: Gauge,
        menuKey: 'fuelConsumption'
      },
      {
        labelKey: 'nav.fuelCards',
        to: '/fleet/fuel-cards',
        group: 'nav.group.fuel',
        icon: CreditCard,
        menuKey: 'fuelCard'
      },
      {
        labelKey: 'nav.fuelCardTransactions',
        to: '/fleet/fuel-cards/transactions',
        group: 'nav.group.fuel',
        icon: Receipt,
        menuKey: 'fuelCard'
      },
      {
        labelKey: 'nav.documents',
        to: '/fleet/documents',
        group: 'nav.group.documents',
        icon: FileText,
        menuKey: 'document'
      },
      {
        labelKey: 'nav.missingDocuments',
        to: '/fleet/documents/missing',
        group: 'nav.group.documents',
        icon: TriangleAlert,
        menuKey: 'document'
      },
      {
        labelKey: 'nav.companyDocuments',
        to: '/fleet/company-documents',
        group: 'nav.group.documents',
        icon: FolderOpen,
        menuKey: 'companyDocument'
      },
      {
        labelKey: 'nav.claims',
        to: '/fleet/claims',
        group: 'nav.group.drivers',
        icon: ShieldAlert,
        menuKey: 'claim'
      },
      {
        labelKey: 'nav.infractions',
        to: '/fleet/infractions',
        group: 'nav.group.drivers',
        icon: Gavel,
        menuKey: 'infraction'
      },
      {
        labelKey: 'nav.trainings',
        to: '/fleet/trainings',
        group: 'nav.group.drivers',
        icon: GraduationCap,
        menuKey: 'training'
      },
      {
        labelKey: 'nav.roadChecklists',
        to: '/fleet/road-checklists',
        group: 'nav.group.vehicles',
        icon: ListChecks,
        menuKey: 'roadChecklist'
      },
      {
        labelKey: 'nav.inspections',
        to: '/fleet/inspections',
        group: 'nav.group.vehicles',
        icon: ClipboardCheck,
        menuKey: 'inspection'
      },
      {
        labelKey: 'nav.insurancePolicies',
        to: '/fleet/insurance-policies',
        group: 'nav.group.vehicles',
        icon: ShieldCheck,
        menuKey: 'insurancePolicy'
      },
      {
        labelKey: 'nav.routeTemplates',
        to: '/fleet/route-templates',
        group: 'nav.group.setup',
        icon: Map,
        menuKey: 'routeTemplate'
      },
      {
        labelKey: 'nav.sites',
        to: '/fleet/sites',
        group: 'nav.group.setup',
        icon: MapPinned,
        menuKey: 'site'
      },
      {
        labelKey: 'nav.providers',
        to: '/fleet/providers',
        group: 'nav.group.setup',
        icon: Handshake,
        menuKey: 'provider'
      },
      {
        labelKey: 'nav.vehicleTypes',
        to: '/fleet/vehicle-types',
        group: 'nav.group.setup',
        icon: Car,
        menuKey: 'vehicleType'
      },
      {
        labelKey: 'nav.equipmentTypes',
        to: '/fleet/equipment-types',
        group: 'nav.group.setup',
        icon: Boxes,
        menuKey: 'equipmentType'
      },
      {
        labelKey: 'nav.providerTypes',
        to: '/fleet/provider-types',
        group: 'nav.group.setup',
        icon: Handshake,
        menuKey: 'providerType'
      },
      {
        labelKey: 'nav.siteTypes',
        to: '/fleet/site-types',
        group: 'nav.group.setup',
        icon: Building,
        menuKey: 'siteType'
      },
      {
        labelKey: 'nav.documentTypes',
        to: '/fleet/document-types',
        group: 'nav.group.setup',
        icon: Files,
        menuKey: 'documentType'
      },
      {
        labelKey: 'nav.checkPoints',
        to: '/fleet/check-points',
        group: 'nav.group.setup',
        icon: ListChecks,
        menuKey: 'checkPoint'
      },
      {
        labelKey: 'nav.inspectionItems',
        to: '/fleet/inspection-items',
        group: 'nav.group.setup',
        icon: ClipboardCheck,
        menuKey: 'inspectionItem'
      },
      {
        labelKey: 'nav.deviationTypes',
        to: '/fleet/deviation-types',
        group: 'nav.group.setup',
        icon: Fence,
        menuKey: 'deviationType'
      },
      {
        labelKey: 'nav.telematicsEventTypes',
        to: '/fleet/telematics-event-types',
        group: 'nav.group.setup',
        icon: Activity,
        menuKey: 'telematicsEventType'
      },
      {
        labelKey: 'nav.alertRules',
        to: '/fleet/alert-rules',
        group: 'nav.group.setup',
        icon: Siren,
        menuKey: 'alertRule'
      },
      {
        labelKey: 'nav.fuelGapCauses',
        to: '/fleet/fuel-gap-causes',
        group: 'nav.group.setup',
        icon: Droplets,
        menuKey: 'fuelGapCause'
      },
      {
        labelKey: 'nav.fuelReferences',
        to: '/fleet/fuel-references',
        group: 'nav.group.setup',
        icon: Gauge,
        menuKey: 'fuelReference'
      },
      {
        labelKey: 'nav.infractionTypes',
        to: '/fleet/infraction-types',
        group: 'nav.group.setup',
        icon: Scale,
        menuKey: 'infractionType'
      },
      {
        labelKey: 'nav.fleetSettings',
        to: '/fleet/settings',
        group: 'nav.group.setup',
        icon: Settings2,
        menuKey: 'fleetSettings'
      }
    ]
  })

  registerSearchableEntity({
    key: 'vehicle',
    feature: 'VEHICLE',
    labelKey: 'fleet.vehicles.title',
    icon: Truck,
    basePath: '/fleet/vehicles',
    searchColumns: 'no,plate,vin,formerPlates',
    service: vehicleService,
    toHit: (vehicle: VehicleApi) => ({
      id: vehicle.no,
      title: vehicle.plate,
      subtitle: `${vehicle.no} · ${vehicle.make} ${vehicle.model}`
    })
  })

  registerSearchableEntity({
    key: 'driver',
    feature: 'DRIVER',
    labelKey: 'fleet.drivers.title',
    icon: UserRound,
    basePath: '/fleet/drivers',
    searchColumns: 'no,fullName,phone,vehiclePlate',
    service: driverService,
    toHit: (driver: DriverApi) => ({
      id: driver.no,
      title: driver.fullName,
      subtitle: [driver.no, driver.vehiclePlate].filter(Boolean).join(' · ')
    })
  })

  registerSearchableEntity({
    key: 'trip',
    feature: 'TRIP',
    labelKey: 'fleet.trips.title',
    icon: Route,
    basePath: '/fleet/trips',
    searchColumns: 'no,vehiclePlate,driverName',
    service: tripService,
    toHit: (trip: TripApi) => ({
      id: trip.no,
      title: `${trip.no} · ${trip.routeName}`,
      subtitle: `${trip.vehiclePlate} · ${trip.driverName} · ${formatDate(trip.plannedDeparture)}`
    })
  })

  registerSearchableEntity({
    key: 'document',
    feature: 'DOCUMENT',
    labelKey: 'fleet.documents.title',
    icon: FileText,
    basePath: '/fleet/documents',
    searchColumns: 'no,subjectName,number',
    service: documentService,
    toHit: (document: DocumentApi) => ({
      id: document.no,
      title: `${document.documentTypeName} · ${document.subjectName}`,
      subtitle: [document.no, document.number].filter(Boolean).join(' · ')
    })
  })
}
