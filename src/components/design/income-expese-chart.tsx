"use client"

import { TrendingUp, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "Income vs Expenses Chart"

const chartData = [
  { month: "January", income: 12500, expenses: -8200 },
  { month: "February", income: 15800, expenses: -9500 },
  { month: "March", income: 11200, expenses: -7800 },
  { month: "April", income: 18900, expenses: -12100 },
  { month: "May", income: 16200, expenses: -10500 },
  { month: "June", income: 21400, expenses: -13200 },
]

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Expenses", 
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig

export function IncomeExpenseChart() {
  const totalIncome = chartData.reduce((sum, month) => sum + month.income, 0);
  const totalExpenses = chartData.reduce((sum, month) => sum + Math.abs(month.expenses), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
            <ArrowUpCircle className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <ArrowDownCircle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="w-full bg-card border">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>Monthly financial overview - January to June 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart 
              data={chartData}
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${Math.abs(value).toLocaleString()}`}
              />
              <ReferenceLine 
                y={0} 
                stroke="hsl(var(--border))" 
                strokeDasharray="3 3" 
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent 
                    className="w-[180px]"
                    formatter={(value, name) => [
                      `$${Math.abs(Number(value)).toLocaleString()}`,
                      name === "expenses" ? "Expenses" : "Income"
                    ]}
                  />
                }
              />
              <Bar dataKey="income" fill="var(--color-income)" name="Income" radius={4} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" name="Expenses" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium">
            Trending up by {profitMargin.toFixed(1)}% margin <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground leading-none">
            Showing income vs expenses for the last 6 months
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
