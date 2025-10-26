import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, TrendingDown, Truck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalShipments: number;
  delivered: number;
  inRoute: number;
  notDelivered: number;
  toReturn: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    delivered: 0,
    inRoute: 0,
    notDelivered: 0,
    toReturn: 0,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    const { data: shipments } = await supabase
      .from("shipments")
      .select("status, substatus");

    if (shipments) {
      const delivered = shipments.filter((s) => s.status === "delivered").length;
      const inRoute = shipments.filter((s) => s.status === "in_transit").length;
      const notDelivered = shipments.filter((s) => s.status === "not_delivered").length;
      const toReturn = shipments.filter((s) => s.substatus === "returning_to_sender").length;

      setStats({
        totalShipments: shipments.length,
        delivered,
        inRoute,
        notDelivered,
        toReturn,
      });
    }
  };

  const statCards = [
    {
      title: "Total de Envios",
      value: stats.totalShipments,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Entregues",
      value: stats.delivered,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Em Rota",
      value: stats.inRoute,
      icon: Truck,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Não Entregues",
      value: stats.notDelivered,
      icon: TrendingDown,
      color: "text-danger",
      bgColor: "bg-danger/10",
    },
    {
      title: "A Devolver",
      value: stats.toReturn,
      icon: AlertCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das entregas Mercado Envios Flex
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Card key={index} className="transition-smooth hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} rounded-lg p-2`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.value > 0 
                    ? `${((stat.value / stats.totalShipments) * 100).toFixed(1)}% do total`
                    : "Nenhum registro"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              Os eventos mais recentes aparecerão aqui
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
