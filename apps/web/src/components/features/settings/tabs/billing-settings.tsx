"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// ============================================================================
// Component
// ============================================================================

export function BillingSettings() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Facturation</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez vos informations de paiement et historique.
        </p>
      </div>
      <Separator />

      {/* Payment Method */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Moyen de paiement</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Votre carte enregistrée pour les renouvellements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-8 w-12 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold shrink-0">
                VISA
              </div>
              <div>
                <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Expire 12/26</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">Modifier</Button>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
            Ajouter une carte
          </Button>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Adresse de facturation</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            Aucune adresse enregistrée
          </p>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">Ajouter une adresse</Button>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Historique des factures</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
            Aucune facture pour le moment
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
