import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Phone, Printer, MapPin, Clock, Search, User } from "lucide-react";
import { PHARMACY_DIRECTORY } from "@/lib/pharmacyDirectory";

export default function PharmacyDirectory() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHARMACY_DIRECTORY;
    return PHARMACY_DIRECTORY.map((bureau) => ({
      bureau: bureau.bureau,
      stores: bureau.stores.filter((s) =>
        [s.rxName, String(s.storeNum), s.director, s.address, s.phone, s.fax]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ),
    })).filter((bureau) => bureau.stores.length > 0);
  }, [query]);

  const totalStores = PHARMACY_DIRECTORY.reduce((sum, b) => sum + b.stores.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
          <BookMarked className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-pharmacy-directory-title">
            Pharmacy Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalStores} pharmacy stores across {PHARMACY_DIRECTORY.length} bureaus
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by store name, number, director, or address..."
          className="pl-9"
          data-testid="input-search-directory"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center" data-testid="empty-pharmacy-directory">
          <BookMarked className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No stores match your search.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {filtered.map((bureau) => (
            <Card key={bureau.bureau} data-testid={`section-bureau-${bureau.bureau.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {bureau.bureau}
                  <Badge variant="secondary" data-testid={`badge-count-${bureau.bureau.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                    {bureau.stores.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bureau.stores.map((store) => (
                  <div
                    key={store.num}
                    className="rounded-md border p-4"
                    data-testid={`card-store-${store.storeNum}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium text-sm" data-testid={`text-name-${store.storeNum}`}>
                          {store.rxName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Store #{store.storeNum}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-director-${store.storeNum}`}>
                        <User className="w-3.5 h-3.5 shrink-0" />
                        {store.director}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                      <div className="flex items-start gap-1.5" data-testid={`text-address-${store.storeNum}`}>
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{store.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5" data-testid={`text-phone-${store.storeNum}`}>
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{store.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5" data-testid={`text-fax-${store.storeNum}`}>
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span>{store.fax}</span>
                      </div>
                      <div className="flex items-start gap-1.5" data-testid={`text-hours-${store.storeNum}`}>
                        <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{store.hours}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
